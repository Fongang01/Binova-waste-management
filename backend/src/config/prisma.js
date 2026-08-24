import "dotenv/config";
import * as PrismaModule from "../../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = PrismaModule;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

export default prisma;