import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanBadPeriods() {
  console.log("🧹 Cleaning up bad billing periods...\n");

  try {
    // Find periods that are clearly wrong (before year 2000)
    const badPeriods = await prisma.billingPeriod.findMany({
      where: {
        startDate: {
          lt: new Date("2000-01-01"),
        },
      },
    });

    console.log(`Found ${badPeriods.length} bad periods:`);
    badPeriods.forEach((period) => {
      console.log(
        `  - ${period.periodName} (${
          period.startDate.toISOString().split("T")[0]
        })`
      );
    });

    if (badPeriods.length === 0) {
      console.log("✅ No bad periods found!");
      return;
    }

    // Delete associated meter readings first
    for (const period of badPeriods) {
      const readingsCount = await prisma.householdMeterReading.count({
        where: { billingPeriodId: period.id },
      });

      if (readingsCount > 0) {
        console.log(
          `  🗑️  Deleting ${readingsCount} readings for period ${period.periodName}`
        );
        await prisma.householdMeterReading.deleteMany({
          where: { billingPeriodId: period.id },
        });
      }

      // Delete the period
      console.log(`  🗑️  Deleting period ${period.periodName}`);
      await prisma.billingPeriod.delete({
        where: { id: period.id },
      });
    }

    console.log("\n✅ Cleanup completed!");

    // Show remaining periods
    const remainingPeriods = await prisma.billingPeriod.findMany({
      orderBy: { periodName: "asc" },
    });

    console.log(`\n📅 Remaining periods: ${remainingPeriods.length}`);
    console.log(
      "Date range:",
      remainingPeriods[0]?.periodName,
      "to",
      remainingPeriods[remainingPeriods.length - 1]?.periodName
    );
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanBadPeriods();
