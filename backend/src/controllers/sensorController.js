import prisma from "../config/prisma.js";

export async function createReading(req, res, next) {
  try {
    const { binId, fillLevel, distanceCm } = req.body;
    if (!binId || fillLevel === undefined) return res.status(400).json({ success: false, message: "binId and fillLevel are required" });
    const bin = await prisma.bin.findUnique({ where: { id: Number(binId) } });
    if (!bin) return res.status(404).json({ success: false, message: "Bin not found" });
    if (fillLevel < 0 || fillLevel > 100) return res.status(400).json({ success: false, message: "Invalid fill level" });

    const reading = await prisma.sensorReading.create({ data: { binId: Number(binId), fillLevel: Number(fillLevel), distanceCm: distanceCm ? Number(distanceCm) : null, recordedAt: new Date() } });

    // update bin fill level
    await prisma.bin.update({ where: { id: Number(binId) }, data: { currentFillLevel: Number(fillLevel) } });

    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    next(err);
  }
}
