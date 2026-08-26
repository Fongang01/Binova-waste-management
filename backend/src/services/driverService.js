import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

export async function createDriver(data) {
  const { email, password, firstName, lastName, phone, status } = data;
  if (!email || !password || !firstName || !lastName) throw { status: 400, message: "Missing required fields" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { status: 409, message: "Email already in use" };

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      role: "DRIVER",
      status: status || "ACTIVE",
    },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true },
  });

  return user;
}

export async function listDrivers() {
  return prisma.user.findMany({
    where: { role: "DRIVER" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      truck: {
        select: {
          id: true,
          registrationNumber: true,
          status: true,
          capacity: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDriver(id) {
  return prisma.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      truck: {
        select: {
          id: true,
          registrationNumber: true,
          status: true,
          capacity: true,
        },
      },
    },
  });
}

export async function updateDriver(id, data) {
  const driverIdNum = Number(id);
  const updates = { ...data };
  delete updates.role;
  delete updates.passwordHash;

  if (data.password) {
    updates.passwordHash = await bcrypt.hash(data.password, 10);
    delete updates.password;
  }

  // Handle truck assignment if truckId is provided (can be number or null/empty)
  if ("truckId" in data) {
    const targetTruckId = data.truckId ? Number(data.truckId) : null;
    delete updates.truckId;

    // Unassign driver from any other truck first
    await prisma.truck.updateMany({
      where: { driverId: driverIdNum },
      data: { driverId: null },
    });

    if (targetTruckId) {
      await prisma.truck.update({
        where: { id: targetTruckId },
        data: { driverId: driverIdNum },
      });
    }
  }

  return prisma.user.update({
    where: { id: driverIdNum },
    data: updates,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      truck: {
        select: {
          id: true,
          registrationNumber: true,
          status: true,
          capacity: true,
        },
      },
    },
  });
}

export async function setDriverStatus(id, status) {
  return prisma.user.update({ where: { id: Number(id) }, data: { status }, select: { id: true, status: true } });
}

export async function deleteDriver(id) {
  return prisma.user.delete({ where: { id: Number(id) } });
}
