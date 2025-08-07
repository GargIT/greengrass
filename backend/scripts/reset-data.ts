import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetData() {
  console.log("🧹 Rensing database (keeping users)...");

  try {
    // Delete in order to respect foreign key constraints
    console.log("Deleting utility billing...");
    await prisma.utilityBilling.deleteMany();

    console.log("Deleting quarterly bills...");
    await prisma.quarterlyBill.deleteMany();

    console.log("Deleting payments...");
    await prisma.payment.deleteMany();

    console.log("Deleting household meter readings...");
    await prisma.householdMeterReading.deleteMany();

    console.log("Deleting main meter readings...");
    await prisma.mainMeterReading.deleteMany();

    console.log("Deleting utility reconciliations...");
    await prisma.utilityReconciliation.deleteMany();

    console.log("Deleting household meters...");
    await prisma.householdMeter.deleteMany();

    console.log("Deleting main meters...");
    await prisma.mainMeter.deleteMany();

    console.log("Deleting utility pricing...");
    await prisma.utilityPricing.deleteMany();

    console.log("Deleting utility services...");
    await prisma.utilityService.deleteMany();

    console.log("Deleting billing periods...");
    await prisma.billingPeriod.deleteMany();

    console.log("Deleting shared costs...");
    await prisma.sharedCost.deleteMany();

    // Reset user household connections but keep users
    console.log("Resetting user household connections...");
    await prisma.user.updateMany({
      data: {
        householdId: null,
      },
    });

    console.log("Deleting households...");
    await prisma.household.deleteMany();

    console.log("✅ Database cleaned! Users preserved.");
    console.log("📊 Remaining users:");

    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        householdId: true,
      },
    });

    console.table(users);
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetData();
