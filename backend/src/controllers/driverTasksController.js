import prisma from "../config/prisma.js";

/**
 * Ensures that a driver's task/route contains ONLY confirmed assigned bins.
 * Unassigned candidate bins or bins belonging to other tasks are strictly excluded.
 */
function sanitizeDriverTaskRoute(task, activeAssignedBinIds) {
  if (!task || !task.recommendedRoute) {
    return task;
  }

  let routeData = null;
  try {
    routeData = typeof task.recommendedRoute === "string" ? JSON.parse(task.recommendedRoute) : task.recommendedRoute;
  } catch (_) {
    return task;
  }

  if (!routeData || !Array.isArray(routeData.orderedStops)) {
    return task;
  }

  const initialCount = routeData.orderedStops.length;

  // Filter ordered stops to ONLY those belonging to the driver's confirmed active assigned bins or this task's assigned bin
  let filteredStops = routeData.orderedStops.filter((stop) => {
    const stopBinId = Number(stop.binId || stop.id);
    return activeAssignedBinIds.has(stopBinId) || stopBinId === task.binId;
  });

  // If all candidate stops were filtered out but task has a valid assigned bin, ensure task's assigned bin is present
  if (filteredStops.length === 0 && task.bin) {
    filteredStops = [
      {
        id: task.bin.id,
        binId: task.bin.id,
        binCode: task.bin.binCode,
        address: task.bin.address || "Yaoundé, Cameroon",
        latitude: Number(task.bin.latitude),
        longitude: Number(task.bin.longitude),
        fillLevel: Number(task.bin.currentFillLevel) || 0,
        capacity: Number(task.bin.capacity) || 50,
        priority: task.priority || "NORMAL",
        stopOrder: 1,
        isCompleted: task.status === "COMPLETED",
      },
    ];
  }

  // Re-number stop orders sequentially
  filteredStops.forEach((s, idx) => {
    s.stopOrder = idx + 1;
  });

  routeData.orderedStops = filteredStops;
  routeData.totalStops = filteredStops.length;

  task.recommendedRoute = JSON.stringify(routeData);

  // If unassigned candidate stops were removed, clean the record in database in place
  if (initialCount !== filteredStops.length) {
    prisma.collectionTask.update({
      where: { id: task.id },
      data: {
        recommendedRoute: task.recommendedRoute,
        notes: task.notes
          ? task.notes.replace(/\[AI Multi-Stop Route: \d+ Stops\]/, `[AI Route: ${filteredStops.length} ${filteredStops.length === 1 ? "Stop" : "Stops"}]`)
          : task.notes,
      },
    }).catch((err) => console.error("Failed to update sanitized task route in DB:", err));
  }

  return task;
}

export async function listMyTasks(req, res, next) {
  try {
    const tasks = await prisma.collectionTask.findMany({
      where: {
        driverId: req.user.id,
        status: { not: "CANCELLED" },
      },
      include: { bin: true, truck: true },
      orderBy: { createdAt: "desc" },
    });

    const activeTasks = tasks.filter((t) => t.status !== "CANCELLED" && t.status !== "COMPLETED");
    const activeAssignedBinIds = new Set(activeTasks.map((t) => t.binId));

    const sanitizedTasks = tasks.map((t) => sanitizeDriverTaskRoute(t, activeAssignedBinIds));

    res.json({ success: true, data: sanitizedTasks });
  } catch (err) {
    next(err);
  }
}

export async function getMyTask(req, res, next) {
  try {
    const task = await prisma.collectionTask.findUnique({
      where: { id: Number(req.params.id) },
      include: { bin: true, truck: true },
    });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task.driverId !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });

    const activeTasks = await prisma.collectionTask.findMany({
      where: {
        driverId: req.user.id,
        status: { in: ["ASSIGNED", "IN_PROGRESS", "PENDING"] },
      },
      select: { binId: true },
    });
    const activeAssignedBinIds = new Set(activeTasks.map((t) => t.binId));

    const sanitizedTask = sanitizeDriverTaskRoute(task, activeAssignedBinIds);

    res.json({ success: true, data: sanitizedTask });
  } catch (err) {
    next(err);
  }
}

export async function getMyTruck(req, res, next) {
  try {
    let truck = await prisma.truck.findFirst({ where: { driverId: req.user.id } });
    if (!truck) {
      const activeTask = await prisma.collectionTask.findFirst({
        where: { driverId: req.user.id, truckId: { not: null } },
        include: { truck: true },
        orderBy: { createdAt: "desc" },
      });
      if (activeTask) truck = activeTask.truck;
    }
    res.json({ success: true, data: truck || null });
  } catch (err) {
    next(err);
  }
}

export async function patchMyTaskStatus(req, res, next) {
  try {
    const { status, action, stopId, completedStopId } = req.body;
    const task = await prisma.collectionTask.findUnique({
      where: { id: Number(req.params.id) },
      include: { bin: true, truck: true },
    });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task.driverId !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });

    const targetStopId = stopId || completedStopId;

    // Handle Individual Stop Completion on an AI Multi-Stop Route
    if (action === "COMPLETE_STOP" || (targetStopId && status !== "COMPLETED")) {
      let routeData = null;
      if (task.recommendedRoute) {
        try {
          routeData = typeof task.recommendedRoute === "string" ? JSON.parse(task.recommendedRoute) : task.recommendedRoute;
        } catch (_) {}
      }

      if (routeData && Array.isArray(routeData.orderedStops)) {
        const stopIndex = routeData.orderedStops.findIndex(
          (s) => s.id === Number(targetStopId) || s.binId === Number(targetStopId)
        );

        if (stopIndex >= 0) {
          const targetStop = routeData.orderedStops[stopIndex];
          targetStop.isCompleted = true;
          targetStop.completedAt = new Date().toISOString();

          if (!Array.isArray(routeData.completedStopIds)) {
            routeData.completedStopIds = [];
          }
          if (!routeData.completedStopIds.includes(targetStop.id)) {
            routeData.completedStopIds.push(targetStop.id);
          }

          // Record collection history for this specific stop/bin
          const targetBin = await prisma.bin.findUnique({ where: { id: targetStop.id } });
          const fillBefore = targetBin ? targetBin.currentFillLevel : (targetStop.fillLevel || 0);

          await prisma.collectionHistory.create({
            data: {
              taskId: task.id,
              binId: targetStop.id,
              driverId: req.user.id,
              collectedAt: new Date(),
              fillLevelBefore: fillBefore,
              fillLevelAfter: 0,
              notes: `Stop #${targetStop.stopOrder || stopIndex + 1} (${targetStop.binCode || 'Bin'}) collected via AI Route`,
            },
          });

          // Reset bin fill level in database
          if (targetBin) {
            await prisma.bin.update({
              where: { id: targetBin.id },
              data: { currentFillLevel: 0 },
            });
          }

          // Check if all stops are now completed
          const allCompleted = routeData.orderedStops.every((s) => s.isCompleted);
          const nextStatus = allCompleted ? "COMPLETED" : "IN_PROGRESS";

          const updatedTask = await prisma.collectionTask.update({
            where: { id: task.id },
            data: {
              status: nextStatus,
              startedAt: task.startedAt || new Date(),
              completedAt: allCompleted ? new Date() : undefined,
              recommendedRoute: JSON.stringify(routeData),
            },
            include: { bin: true, truck: true },
          });

          return res.json({
            success: true,
            data: updatedTask,
            message: allCompleted
              ? "All collection stops completed! Task finished."
              : `Stop #${targetStop.stopOrder || stopIndex + 1} (${targetStop.binCode}) completed.`,
            allStopsCompleted: allCompleted,
          });
        }
      }
    }

    // Standard Status Transition
    if (!status) return res.status(400).json({ success: false, message: "Status required" });

    const valid = {
      ASSIGNED: ["IN_PROGRESS", "ASSIGNED", "COMPLETED"],
      PENDING: ["IN_PROGRESS", "ASSIGNED", "COMPLETED"],
      IN_PROGRESS: ["COMPLETED", "IN_PROGRESS"],
      COMPLETED: [],
    };
    if (task.status === status) {
      return res.json({ success: true, data: task });
    }
    if (!valid[task.status] || !valid[task.status].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status transition" });
    }

    let routeData = null;
    if (task.recommendedRoute) {
      try {
        routeData = typeof task.recommendedRoute === "string" ? JSON.parse(task.recommendedRoute) : task.recommendedRoute;
      } catch (_) {}
    }

    // If marking task as COMPLETED, process all stops or primary bin
    if (status === "COMPLETED") {
      if (routeData && Array.isArray(routeData.orderedStops)) {
        // Complete all uncompleted stops in the AI route
        for (let i = 0; i < routeData.orderedStops.length; i++) {
          const stop = routeData.orderedStops[i];
          if (!stop.isCompleted) {
            stop.isCompleted = true;
            stop.completedAt = new Date().toISOString();
            if (!Array.isArray(routeData.completedStopIds)) routeData.completedStopIds = [];
            if (!routeData.completedStopIds.includes(stop.id)) routeData.completedStopIds.push(stop.id);

            const bin = await prisma.bin.findUnique({ where: { id: stop.id } });
            await prisma.collectionHistory.create({
              data: {
                taskId: task.id,
                binId: stop.id,
                driverId: task.driverId,
                collectedAt: new Date(),
                fillLevelBefore: bin ? bin.currentFillLevel : (stop.fillLevel || 0),
                fillLevelAfter: 0,
                notes: `Stop #${stop.stopOrder || i + 1} (${stop.binCode || 'Bin'}) collected via AI Route`,
              },
            });
            if (bin) {
              await prisma.bin.update({ where: { id: bin.id }, data: { currentFillLevel: 0 } });
            }
          }
        }
      } else {
        // Single Manual Task
        const exists = await prisma.collectionHistory.findFirst({ where: { taskId: task.id } });
        if (!exists) {
          const bin = await prisma.bin.findUnique({ where: { id: task.binId } });
          await prisma.collectionHistory.create({
            data: {
              taskId: task.id,
              binId: task.binId,
              driverId: task.driverId,
              collectedAt: new Date(),
              fillLevelBefore: bin ? bin.currentFillLevel : 0,
              fillLevelAfter: 0,
              notes: task.notes,
            },
          });
          if (bin) {
            await prisma.bin.update({ where: { id: bin.id }, data: { currentFillLevel: 0 } });
          }
        }
      }
    }

    const updated = await prisma.collectionTask.update({
      where: { id: Number(req.params.id) },
      data: {
        status,
        startedAt: status === "IN_PROGRESS" ? (task.startedAt || new Date()) : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        recommendedRoute: routeData ? JSON.stringify(routeData) : undefined,
      },
      include: { bin: true, truck: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function completeTaskStop(req, res, next) {
  req.body = { ...req.body, action: "COMPLETE_STOP", stopId: req.body.stopId || req.params.stopId };
  return patchMyTaskStatus(req, res, next);
}
