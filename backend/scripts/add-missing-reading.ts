import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addMissingReading() {
  console.log("🔧 Adding missing meter reading for Hus 12 (meter change)...\n");

  try {
    // Find Hus 12
    const household12 = await prisma.household.findFirst({
      where: { householdNumber: 12 },
    });

    if (!household12) {
      console.log("❌ Could not find Hus 12");
      return;
    }

    // Find its meter
    const meter12 = await prisma.householdMeter.findFirst({
      where: { householdId: household12.id },
    });

    if (!meter12) {
      console.log("❌ Could not find meter for Hus 12");
      return;
    }

    // Find or create billing period for 2019-08-31
    const periodDate = new Date("2019-08-31");
    const periodName = "2019-08-31";

    let billingPeriod = await prisma.billingPeriod.findFirst({
      where: { periodName },
    });

    if (!billingPeriod) {
      billingPeriod = await prisma.billingPeriod.create({
        data: {
          periodName,
          periodType: "quarterly",
          startDate: periodDate,
          endDate: periodDate,
          readingDeadline: periodDate,
          isOfficialBilling: true,
          isBillingEnabled: true,
        },
      });
      console.log(`📅 Created billing period: ${periodName}`);
    } else {
      console.log(`📅 Found existing billing period: ${periodName}`);
    }

    // Check if reading already exists
    const existingReading = await prisma.householdMeterReading.findFirst({
      where: {
        householdMeterId: meter12.id,
        billingPeriodId: billingPeriod.id,
      },
    });

    if (existingReading) {
      console.log("⚠️  Reading already exists for this period");
      return;
    }

    // Create the meter reading with 0 meter reading but 54 raw consumption
    const newReading = await prisma.householdMeterReading.create({
      data: {
        householdMeterId: meter12.id,
        billingPeriodId: billingPeriod.id,
        meterReading: 0, // New meter, starts at 0
        readingDate: periodDate,
        rawConsumption: 54, // Estimated consumption
        notes: "Mätarbyte - ny mätare börjar på 0, uppskattad förbrukning",
      },
    });

    console.log("✅ Added missing reading:");
    console.log(
      `   Hus 12: 0m³ (uppskattad förbrukning: 54m³) - ${periodName}`
    );
    console.log(`   Note: ${newReading.notes}`);

    // Verify the count now
    const readingCount = await prisma.householdMeterReading.count({
      where: { householdMeterId: meter12.id },
    });

    console.log(`\n📊 Hus 12 now has ${readingCount} readings`);
  } catch (error) {
    console.error("❌ Error adding reading:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingReading();
