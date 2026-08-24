import prisma from "../config/prisma.js";

export async function getSummary() {
  const totalDrivers = await prisma.user.count({ where: { role: "DRIVER" } });
  const activeDrivers = await prisma.user.count({ where: { role: "DRIVER", status: "ACTIVE" } });
  const totalTrucks = await prisma.truck.count();
  const availableTrucks = await prisma.truck.count({ where: { status: "AVAILABLE" } });
  const totalBins = await prisma.bin.count();
  const criticalBins = await prisma.bin.count({ where: { currentFillLevel: { gte: 80 } } });
  const pendingTasks = await prisma.collectionTask.count({ where: { status: "ASSIGNED" } });
  const inProgressTasks = await prisma.collectionTask.count({ where: { status: "IN_PROGRESS" } });
  const completedTasks = await prisma.collectionTask.count({ where: { status: "COMPLETED" } });

  return { totalDrivers, activeDrivers, totalTrucks, availableTrucks, totalBins, criticalBins, pendingTasks, inProgressTasks, completedTasks };
}
