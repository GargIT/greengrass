import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking imported data...\n");

  // Check utility services
  const utilityServices = await prisma.utilityService.findMany();
  console.log("💧 Utility Services:", utilityServices.length);
  utilityServices.forEach((service) => console.log(`  - ${service.name}`));

  // Check main meters
  const mainMeters = await prisma.mainMeter.findMany({
    include: { service: true },
  });
  console.log("\n📊 Main Meters:", mainMeters.length);
  mainMeters.forEach((meter) =>
    console.log(`  - ${meter.meterIdentifier} (${meter.service.name})`)
  );

  // Check households
  const households = await prisma.household.findMany({
    orderBy: { householdNumber: "asc" },
  });
  console.log("\n🏠 Households:", households.length);
  households.forEach((household) =>
    console.log(`  - ${household.ownerName} (Hus ${household.householdNumber})`)
  );

  // Check household meters
  const householdMeters = await prisma.householdMeter.findMany({
    include: { household: true },
  });
  console.log("\n🔧 Household Meters:", householdMeters.length);

  // Check meter readings
  const readings = await prisma.householdMeterReading.findMany();
  console.log("\n📈 Meter Readings:", readings.length);

  // Check billing periods
  const billingPeriods = await prisma.billingPeriod.findMany({
    orderBy: { periodName: "asc" },
  });
  console.log("\n📅 Billing Periods:", billingPeriods.length);
  console.log(
    "First 10:",
    billingPeriods.slice(0, 10).map((p) => p.periodName)
  );

  // Sample reading data
  const sampleReadings = await prisma.householdMeterReading.findMany({
    take: 5,
    include: {
      householdMeter: {
        include: {
          household: true,
        },
      },
      billingPeriod: true,
    },
    orderBy: { id: "asc" },
  });

  console.log("\n📊 Readings per household:");
  for (const household of households) {
    const householdMeter = await prisma.householdMeter.findFirst({
      where: { householdId: household.id },
    });

    if (householdMeter) {
      const readingCount = await prisma.householdMeterReading.count({
        where: { householdMeterId: householdMeter.id },
      });
      console.log(
        `  - Hus ${household.householdNumber}: ${readingCount} avläsningar`
      );
    }
  }

  console.log("\n📋 Sample Readings:");
  sampleReadings.forEach((reading) => {
    console.log(
      `  - ${reading.householdMeter.household.ownerName}: ${reading.meterReading}m³ (${reading.billingPeriod.periodName})`
    );
  });

  // Check main meter readings
  const mainMeterReadings = await prisma.mainMeterReading.findMany();
  console.log("\n📊 Main Meter Readings:", mainMeterReadings.length);

  // Check readings per main meter
  console.log("\n📈 Readings per main meter:");
  for (const meter of mainMeters) {
    const readingCount = await prisma.mainMeterReading.count({
      where: { meterId: meter.id },
    });
    console.log(`  - ${meter.meterIdentifier}: ${readingCount} avläsningar`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
