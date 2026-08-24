import prisma from "../config/prisma.js";

function validateCoords(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (Number.isNaN(la) || Number.isNaN(lo)) return false;
  if (la < -90 || la > 90) return false;
  if (lo < -180 || lo > 180) return false;
  return true;
}

export async function createBin(data) {
  const { binCode, latitude, longitude, capacity, currentFillLevel, address } = data;
  if (!binCode || latitude === undefined || longitude === undefined || !capacity) throw { status: 400, message: "Missing required fields" };
  if (!validateCoords(latitude, longitude)) throw { status: 400, message: "Invalid coordinates" };
  if (currentFillLevel !== undefined && (currentFillLevel < 0 || currentFillLevel > 100)) throw { status: 400, message: "Invalid fill level" };

  const existing = await prisma.bin.findUnique({ where: { binCode } });
  if (existing) throw { status: 409, message: "Bin code already exists" };

  return prisma.bin.create({ data: { binCode, latitude: Number(latitude), longitude: Number(longitude), capacity: Number(capacity), currentFillLevel: currentFillLevel !== undefined ? Number(currentFillLevel) : 0, address, status: data.status || "ACTIVE" } });
}

export async function listBins(filter) {
  const where = {};
  if (filter && filter.status) where.status = filter.status;
  return prisma.bin.findMany({ where });
}

export async function getBin(id) {
  return prisma.bin.findUnique({ where: { id: Number(id) } });
}

export async function updateBin(id, data) {
  if (data.latitude !== undefined || data.longitude !== undefined) {
    if (!validateCoords(data.latitude, data.longitude)) throw { status: 400, message: "Invalid coordinates" };
  }
  if (data.currentFillLevel !== undefined && (data.currentFillLevel < 0 || data.currentFillLevel > 100)) throw { status: 400, message: "Invalid fill level" };

  return prisma.bin.update({ where: { id: Number(id) }, data: { ...data } });
}

export async function setBinStatus(id, status) {
  return prisma.bin.update({ where: { id: Number(id) }, data: { status } });
}

export async function deleteBin(id) {
  return prisma.bin.delete({ where: { id: Number(id) } });
}
