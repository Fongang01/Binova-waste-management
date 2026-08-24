import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

export async function createDriver(data) {
  const { email, password, firstName, lastName } = data;
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
      role: "DRIVER",
      status: "ACTIVE",
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  });

  return user;
}

export async function listDrivers() {
  return prisma.user.findMany({ where: { role: "DRIVER" }, select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true } });
}

export async function getDriver(id) {
  return prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true } });
}

export async function updateDriver(id, data) {
  const updates = { ...data };
  delete updates.role;
  delete updates.passwordHash;
  if (data.password) {
    updates.passwordHash = await bcrypt.hash(data.password, 10);
    delete updates.password;
  }

  return prisma.user.update({ where: { id: Number(id) }, data: updates, select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true } });
}

export async function setDriverStatus(id, status) {
  return prisma.user.update({ where: { id: Number(id) }, data: { status }, select: { id: true, status: true } });
}
