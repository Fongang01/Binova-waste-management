import prisma from "../config/prisma.js";

const VALID_SOURCES = ["MANUAL", "AI_RECOMMENDATION"];

export async function createTask(data) {
  const { binId, driverId, truckId, source } = data;
  if (!binId) throw { status: 400, message: "binId is required" };
  if (source && !VALID_SOURCES.includes(source)) throw { status: 400, message: "Invalid source" };

  // Only ADMIN controller will call this; service trusts caller
  return prisma.collectionTask.create({ data: { binId: Number(binId), driverId: driverId ? Number(driverId) : null, truckId: truckId ? Number(truckId) : null, status: data.status || "ASSIGNED", priority: data.priority || "NORMAL", source: source || "MANUAL", recommendedRoute: data.recommendedRoute || null, distance: data.distance ? Number(data.distance) : null, estimatedDuration: data.estimatedDuration || null, notes: data.notes || null } });
}

export async function listTasks(filter) {
  const where = {};
  if (filter && filter.status) where.status = filter.status;
  if (filter && filter.driverId) where.driverId = Number(filter.driverId);

  return prisma.collectionTask.findMany({ where, include: { bin: true, driver: { select: { id: true, firstName: true, lastName: true } }, truck: true } });
}

export async function getTask(id) {
  return prisma.collectionTask.findUnique({ where: { id: Number(id) }, include: { bin: true, driver: true, truck: true } });
}

export async function updateTask(id, data) {
  return prisma.collectionTask.update({ where: { id: Number(id) }, data });
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

  // avoid duplicate history: check by taskId
  const exists = await prisma.collectionHistory.findFirst({ where: { taskId: task.id } });
  if (exists) return;

  await prisma.collectionHistory.create({ data: { taskId: task.id, binId: task.binId, driverId: task.driverId, collectionDate: new Date(), fillLevelBefore: bin.currentFillLevel, fillLevelAfter: 0, notes: task.notes } });
  // Reset bin fill level after collection (assumption)
  await prisma.bin.update({ where: { id: bin.id }, data: { currentFillLevel: 0 } });
}
