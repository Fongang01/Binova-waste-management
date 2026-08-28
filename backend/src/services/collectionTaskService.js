import prisma from "../config/prisma.js";

const VALID_SOURCES = ["MANUAL", "AI_RECOMMENDATION"];

export async function createTask(data) {
  const { binId, driverId, truckId, source, status, priority, distanceKm, distance, estimatedDuration, recommendedRoute, notes } = data;
  if (!binId) throw { status: 400, message: "binId is required" };
  if (source && !VALID_SOURCES.includes(source)) throw { status: 400, message: "Invalid source" };

  return prisma.collectionTask.create({
    data: {
      binId: Number(binId),
      driverId: driverId ? Number(driverId) : null,
      truckId: truckId ? Number(truckId) : null,
      status: status || "ASSIGNED",
      priority: priority || "NORMAL",
      source: source || "MANUAL",
      recommendedRoute: recommendedRoute || null,
      distanceKm: distanceKm !== undefined && distanceKm !== null ? Number(distanceKm) : (distance !== undefined && distance !== null ? Number(distance) : null),
      estimatedDuration: estimatedDuration ? Number(estimatedDuration) : null,
      notes: notes || null,
    },
  });
}

export async function listTasks(filter) {
  const where = {};
  if (filter && filter.status) where.status = filter.status;
  if (filter && filter.driverId) where.driverId = Number(filter.driverId);

  return prisma.collectionTask.findMany({
    where,
    include: {
      bin: true,
      driver: { select: { id: true, firstName: true, lastName: true, email: true } },
      truck: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTask(id) {
  return prisma.collectionTask.findUnique({ where: { id: Number(id) }, include: { bin: true, driver: true, truck: true } });
}

export async function updateTask(id, data) {
  return prisma.collectionTask.update({ where: { id: Number(id) }, data });
}

export async function deleteTask(id, adminUser) {
  const task = await prisma.collectionTask.findUnique({
    where: { id: Number(id) },
    include: { bin: true, driver: true, truck: true },
  });
  if (!task) throw { status: 404, message: "Task not found" };

  const adminName = adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() : 'Administrator';
  const adminEmail = adminUser?.email || 'admin';
  const adminInfo = `${adminName} (${adminEmail})`;
  const now = new Date();
  const auditNote = `[DELETED] Deleted by Admin: ${adminInfo} on ${now.toISOString()}. Original status: ${task.status}.`;
  const combinedNotes = task.notes ? `${task.notes}\n${auditNote}` : auditNote;

  // Soft delete / cancel the task
  const updated = await prisma.collectionTask.update({
    where: { id: Number(id) },
    data: {
      status: "CANCELLED",
      notes: combinedNotes,
    },
    include: { bin: true, driver: { select: { id: true, firstName: true, lastName: true } }, truck: true },
  });

  // Preserve in collection audit history
  try {
    await prisma.collectionHistory.create({
      data: {
        taskId: task.id,
        binId: task.binId,
        driverId: task.driverId,
        collectedAt: now,
        fillLevelBefore: task.bin ? task.bin.currentFillLevel : null,
        fillLevelAfter: task.bin ? task.bin.currentFillLevel : null,
        notes: `[DELETED] Deleted by Admin: ${adminInfo}. Original Status: ${task.status}`,
      },
    });
  } catch (err) {
    console.error("Failed to record collection history audit entry:", err);
  }

  return updated;
}

export async function setTaskStatus(id, status) {
  // Validate transitions lightly
  const task = await prisma.collectionTask.findUnique({ where: { id: Number(id) } });
  if (!task) throw { status: 404, message: "Task not found" };
  const valid = {
    ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
  };
  if (task.status === status) return task;
  if (!valid[task.status] || !valid[task.status].includes(status)) throw { status: 400, message: "Invalid status transition" };

  const updated = await prisma.collectionTask.update({ where: { id: Number(id) }, data: { status } });

  if (status === "COMPLETED") {
    // create history
    await createHistoryFromTask(updated);
  }

  return updated;
}

async function createHistoryFromTask(task) {
  const bin = await prisma.bin.findUnique({ where: { id: task.binId } });
  if (!bin) return;

  const exists = await prisma.collectionHistory.findFirst({ where: { taskId: task.id } });
  if (exists) return;

  await prisma.collectionHistory.create({
    data: {
      taskId: task.id,
      binId: task.binId,
      driverId: task.driverId,
      collectedAt: new Date(),
      fillLevelBefore: bin.currentFillLevel,
      fillLevelAfter: 0,
      notes: task.notes,
    },
  });

  await prisma.bin.update({ where: { id: bin.id }, data: { currentFillLevel: 0 } });
}
