import "dotenv/config";
import prisma from "../src/config/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@binova.cm";
  const password = process.env.ADMIN_PASSWORD || "changeme";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({ data: { email, passwordHash, firstName: "Admin", lastName: "Binova", role: "ADMIN", status: "ACTIVE" } });
  console.log("Created admin:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
