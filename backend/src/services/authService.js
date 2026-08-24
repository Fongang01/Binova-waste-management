import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

export async function loginAdmin(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const match = await bcrypt.compare(password, user.passwordHash || "");
  if (!match) return null;
  if (user.status !== "ACTIVE") return { disabled: true };
  if (user.role !== "ADMIN") return { forbidden: true };

  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "8h" });

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  };
}

