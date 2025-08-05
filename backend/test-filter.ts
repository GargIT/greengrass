import { prisma } from "./src/lib/prisma";

async function testFilter() {
  try {
    const now = new Date(); // 2025-08-05
    console.log(`Current date: ${now.toISOString()}`);

    // Test the current filter logic
    const filteredPeriods = await prisma.billingPeriod.findMany({
      where: {
        OR: [
          // Past periods (end date is before today)
          { endDate: { lt: now } },
          // Current period (we are in the middle of it)
          {
            AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }],
          },
          // Next upcoming period (starts within next 30 days)
          {
            AND: [
              { startDate: { gt: now } },
              {
                startDate: {
                  lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
                },
              },
            ],
          },
        ],
      },
      orderBy: { startDate: "desc" },
      select: {
        periodName: true,
        startDate: true,
        endDate: true,
      },
    });

    console.log(`\nFiltered periods count: ${filteredPeriods.length}`);
    console.log("\nFirst 10 filtered periods:");
    filteredPeriods.slice(0, 10).forEach((p) => {
      console.log(
        `- ${p.periodName}: ${p.startDate.toISOString().split("T")[0]} to ${
          p.endDate.toISOString().split("T")[0]
        }`
      );
    });

    // Show periods that would be excluded
    const excludedPeriods = await prisma.billingPeriod.findMany({
      where: {
        NOT: {
          OR: [
            { endDate: { lt: now } },
            {
              AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }],
            },
            {
              AND: [
                { startDate: { gt: now } },
                {
                  startDate: {
                    lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
                  },
                },
              ],
            },
          ],
        },
      },
      orderBy: { startDate: "asc" },
      select: {
        periodName: true,
        startDate: true,
        endDate: true,
      },
    });

    console.log(`\nExcluded periods count: ${excludedPeriods.length}`);
    console.log("First 10 excluded periods:");
    excludedPeriods.slice(0, 10).forEach((p) => {
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

testFilter();
