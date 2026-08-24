import prisma from "../config/prisma.js";

export async function listMyTasks(req, res, next) {
  try {
    const tasks = await prisma.collectionTask.findMany({ where: { driverId: req.user.id }, include: { bin: true, truck: true } });
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

export async function patchMyTaskStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status required" });
    const task = await prisma.collectionTask.findUnique({ where: { id: Number(req.params.id) } });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task.driverId !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });

    const valid = {
      ASSIGNED: ["IN_PROGRESS"],
      IN_PROGRESS: ["COMPLETED"],
      COMPLETED: [],
    };
    if (!valid[task.status] || !valid[task.status].includes(status)) return res.status(400).json({ success: false, message: "Invalid status transition" });

    const updated = await prisma.collectionTask.update({ where: { id: Number(req.params.id) }, data: { status } });
    if (status === "COMPLETED") {
      // create history if not exists
      const exists = await prisma.collectionHistory.findFirst({ where: { taskId: updated.id } });
      if (!exists) {
        const bin = await prisma.bin.findUnique({ where: { id: updated.binId } });
        await prisma.collectionHistory.create({ data: { taskId: updated.id, binId: updated.binId, driverId: updated.driverId, collectionDate: new Date(), fillLevelBefore: bin.currentFillLevel, fillLevelAfter: 0, notes: updated.notes } });
        await prisma.bin.update({ where: { id: bin.id }, data: { currentFillLevel: 0 } });
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
