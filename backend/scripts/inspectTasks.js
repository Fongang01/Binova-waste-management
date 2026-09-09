import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function main() {
  const drivers = await prisma.user.findMany({
    where: { role: "DRIVER" },
  });
  console.log("Drivers in DB:", drivers.map(d => ({ id: d.id, name: `${d.firstName} ${d.lastName}`, email: d.email })));

  const fossi = drivers.find(d => 
    d.lastName?.toLowerCase().includes("fossi") || 
    d.firstName?.toLowerCase().includes("fossi") || 
    d.firstName?.toLowerCase().includes("tamwo")
  );
  
  if (!fossi) {
    console.log("Could not find fossi among drivers!");
    return;
  }
  
  console.log(`\n=== TASKS FOR DRIVER ${fossi.firstName} ${fossi.lastName} (ID: ${fossi.id}) ===`);
  const tasks = await prisma.collectionTask.findMany({
    where: { driverId: fossi.id },
    include: { bin: true, truck: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Total tasks found: ${tasks.length}`);
  tasks.forEach((t) => {
    console.log(`\n--- Task #${t.id} ---`);
    console.log(`Status: ${t.status}`);
    console.log(`Priority: ${t.priority}`);
    console.log(`Source: ${t.source}`);
    console.log(`Bin ID: ${t.binId}, Bin Code: ${t.bin?.binCode}, Bin Location: ${t.bin?.address}`);
    console.log(`Notes: ${t.notes}`);
    if (t.recommendedRoute) {
      try {
        const parsed = JSON.parse(t.recommendedRoute);
        console.log(`isAiOptimized: ${parsed.isAiOptimized}`);
        console.log(`Total Stops: ${parsed.totalStops}`);
        console.log(`Ordered Stops:`, parsed.orderedStops?.map(s => `[#${s.stopOrder}] ID:${s.id} ${s.binCode} (${s.address}) - isCompleted: ${s.isCompleted}`));
        console.log(`Completed Stop IDs:`, parsed.completedStopIds);
      } catch (e) {
        console.log(`Failed to parse recommendedRoute:`, e.message);
      }
    } else {
      console.log(`recommendedRoute: NULL (Manual Single Task)`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
