import prisma from "../config/prisma.js";

export async function createTruck(data) {
  const { registrationNumber, capacity, driverId } = data;
  if (!registrationNumber || !capacity) throw { status: 400, message: "Missing required fields" };
  if (capacity <= 0) throw { status: 400, message: "Invalid capacity" };

  const existing = await prisma.truck.findUnique({ where: { registrationNumber } });
  if (existing) throw { status: 409, message: "Registration number already in use" };

  // prevent assigning driver to multiple trucks if driverId provided
  if (driverId) {
    const assigned = await prisma.truck.findFirst({ where: { driverId: Number(driverId) } });
    if (assigned) throw { status: 409, message: "Driver already assigned to a truck" };
  }

  return prisma.truck.create({ data: { registrationNumber, capacity: Number(capacity), status: data.status || "AVAILABLE", driverId: driverId ? Number(driverId) : null } });
}

export async function listTrucks() {
  return prisma.truck.findMany({ include: { driver: { select: { id: true, firstName: true, lastName: true, email: true } } } });
}

export async function getTruck(id) {
  return prisma.truck.findUnique({ where: { id: Number(id) }, include: { driver: { select: { id: true, firstName: true, lastName: true, email: true } } } });
}

export async function updateTruck(id, data) {
  if (data.capacity && data.capacity <= 0) throw { status: 400, message: "Invalid capacity" };
  if (data.driverId) {
    const assigned = await prisma.truck.findFirst({ where: { driverId: Number(data.driverId), NOT: { id: Number(id) } } });
    if (assigned) throw { status: 409, message: "Driver already assigned to another truck" };
  }
  return prisma.truck.update({ where: { id: Number(id) }, data: { ...data, capacity: data.capacity ? Number(data.capacity) : undefined } });
}

export async function setTruckStatus(id, status) {
  return prisma.truck.update({ where: { id: Number(id) }, data: { status } });
}

export async function deleteTruck(id) {
  return prisma.truck.delete({ where: { id: Number(id) } });
}
