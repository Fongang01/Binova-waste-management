import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

export async function loginAdmin(email, password) {
  // Backwards-compatible wrapper for admin login that enforces ADMIN role
  const result = await loginUser(email, password);
  if (!result) return null;
  if (result.user.role !== "ADMIN") return { forbidden: true };
  return result;
}

export async function loginUser(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const match = await bcrypt.compare(password, user.passwordHash || "");
  if (!match) return null;
  if (user.status !== "ACTIVE") return { disabled: true };

  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "8h" });

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.firstName || 'Administrator',
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      status: user.status,
    },
  };
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
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
        },
      },
    },
  });
  if (!user) throw { status: 404, message: "User not found" };
  return {
    ...user,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.firstName || 'User',
  };
}

export async function updateProfile(userId, data) {
  const { firstName, lastName, phone } = data;
  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName.trim();
  if (lastName !== undefined) updates.lastName = lastName.trim();
  if (phone !== undefined) updates.phone = phone ? phone.trim() : null;

  const user = await prisma.user.update({
    where: { id: Number(userId) },
    data: updates,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...user,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.firstName || 'User',
  };
}

export async function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw { status: 400, message: "Current password and new password are required" };
  }
  if (newPassword.length < 6) {
    throw { status: 400, message: "New password must be at least 6 characters" };
  }

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) throw { status: 404, message: "User not found" };

  const match = await bcrypt.compare(currentPassword, user.passwordHash || "");
  if (!match) throw { status: 400, message: "Current password does not match" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: Number(userId) },
    data: { passwordHash },
  });

  return { success: true, message: "Password updated successfully" };
}


