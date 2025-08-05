import { prisma } from "./src/lib/prisma";

async function checkBillingPeriods() {
  try {
    const count = await prisma.billingPeriod.count();
    console.log(`Total billing periods in database: ${count}`);

    // Get first 5 periods to see what we have
    const sample = await prisma.billingPeriod.findMany({
      take: 5,
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        periodName: true,
        startDate: true,
        endDate: true,
      },
    });

    console.log("\nFirst 5 periods:");
    sample.forEach((p) => {
      console.log(
        `- ${p.periodName}: ${p.startDate.toISOString().split("T")[0]} to ${
          p.endDate.toISOString().split("T")[0]
        }`
      );
    });

    // Get last 5 periods
    const lastSample = await prisma.billingPeriod.findMany({
      take: 5,
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        periodName: true,
        startDate: true,
        endDate: true,
      },
    });

    console.log("\nLast 5 periods:");
    lastSample.forEach((p) => {
      console.log(
        `- ${p.periodName}: ${p.startDate.toISOString().split("T")[0]} to ${
          p.endDate.toISOString().split("T")[0]
        }`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBillingPeriods();
