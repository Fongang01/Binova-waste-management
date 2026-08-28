import prisma from "../config/prisma.js";

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
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function getMyTask(req, res, next) {
  try {
    const task = await prisma.collectionTask.findUnique({ where: { id: Number(req.params.id) }, include: { bin: true, truck: true } });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task.driverId !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });
    res.json({ success: true, data: task });
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
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status required" });
    const task = await prisma.collectionTask.findUnique({ where: { id: Number(req.params.id) } });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task.driverId !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });

    const valid = {
      ASSIGNED: ["IN_PROGRESS", "ASSIGNED"],
      PENDING: ["IN_PROGRESS", "ASSIGNED"],
      IN_PROGRESS: ["COMPLETED", "IN_PROGRESS"],
      COMPLETED: [],
    };
    if (task.status === status) {
      return res.json({ success: true, data: task });
    }
    if (!valid[task.status] || !valid[task.status].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status transition" });
    }

    const updated = await prisma.collectionTask.update({
      where: { id: Number(req.params.id) },
      data: {
        status,
        startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    });

    if (status === "COMPLETED") {
      // create history if not exists
      const exists = await prisma.collectionHistory.findFirst({ where: { taskId: updated.id } });
      if (!exists) {
        const bin = await prisma.bin.findUnique({ where: { id: updated.binId } });
        await prisma.collectionHistory.create({
          data: {
            taskId: updated.id,
            binId: updated.binId,
            driverId: updated.driverId,
            collectedAt: new Date(),
            fillLevelBefore: bin ? bin.currentFillLevel : 0,
            fillLevelAfter: 0,
            notes: updated.notes,
          },
        });
        if (bin) {
          await prisma.bin.update({ where: { id: bin.id }, data: { currentFillLevel: 0 } });
        }
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
