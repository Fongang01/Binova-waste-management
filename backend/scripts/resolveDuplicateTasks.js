import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function main() {
  console.log("=== RESOLVING DUPLICATE / OBSOLETE TASKS ===");
  
  // Find task 7 (the legacy manual bastos task)
  const task7 = await prisma.collectionTask.findUnique({
    where: { id: 7 },
  });

  if (task7) {
    console.log(`Found Task #7: status=${task7.status}, binId=${task7.binId}, driverId=${task7.driverId}`);
    const updated = await prisma.collectionTask.update({
      where: { id: 7 },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        notes: "Consolidated into AI Multi-Stop Route Task #9",
      },
    });
    console.log(`Task #7 marked as COMPLETED (${updated.notes})`);
  } else {
    console.log("Task #7 not found.");
  }

  // Also check if any other active manual tasks conflict with active AI routes
  const activeAiTasks = await prisma.collectionTask.findMany({
    where: {
      source: "AI_RECOMMENDATION",
      status: { in: ["ASSIGNED", "IN_PROGRESS", "PENDING"] },
    },
  });

  for (const aiTask of activeAiTasks) {
    let binIds = [];
    if (aiTask.recommendedRoute) {
      try {
        const parsed = JSON.parse(aiTask.recommendedRoute);
        if (Array.isArray(parsed.orderedStops)) {
          binIds = parsed.orderedStops.map(s => s.id);
        }
      } catch (_) {}
    }
    if (binIds.length > 0) {
      const superseded = await prisma.collectionTask.updateMany({
        where: {
          binId: { in: binIds },
          id: { not: aiTask.id },
          status: { in: ["ASSIGNED", "IN_PROGRESS", "PENDING"] },
          source: { not: "AI_RECOMMENDATION" },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          notes: `Consolidated into AI Route Task #${aiTask.id}`,
        },
      });
      if (superseded.count > 0) {
        console.log(`Consolidated ${superseded.count} duplicate single task(s) into AI Route #${aiTask.id}`);
      }
    }
  }

  console.log("Duplicate resolution complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
