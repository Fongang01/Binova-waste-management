import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "./src/config/prisma.js";

const adminEmail = "admin@binova.cm";
const adminPassword = "Admin@12345";

async function createAdmin() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: adminEmail
      }
    });

    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        firstName: "Binova",
        lastName: "Administrator",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE"
      }
    });

    console.log("Admin account created successfully.");
    console.log("Email:", admin.email);
    console.log("Password:", adminPassword);
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();