import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const jwtSecret = process.env.JWT_SECRET;

export async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const token = auth.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid token user" });
    if (user.status !== "ACTIVE") return res.status(403).json({ success: false, message: "User is not active" });

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    if (req.user.role !== role) return res.status(403).json({ success: false, message: "Insufficient permissions" });
    next();
  };
}
