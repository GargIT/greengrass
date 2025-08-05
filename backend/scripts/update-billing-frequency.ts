import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateBillingFrequencyToTertiary() {
  console.log(
    "🔄 Updating utility services billing frequency to TERTIARY...\n"
  );

  try {
    // Get all utility services that are currently QUARTERLY
    const services = await prisma.utilityService.findMany({
      where: {
        billingFrequency: "QUARTERLY",
      },
    });

    console.log(
      `Found ${services.length} services with QUARTERLY billing frequency:`
    );

    for (const service of services) {
      console.log(
        `  - ${service.name} (${service.serviceType}): ${service.billingFrequency}`
      );
    }

    if (services.length === 0) {
      console.log(
        "✅ No services need updating - all are already using correct billing frequency"
      );
      return;
    }

    console.log("\n🔧 Updating services to TERTIARY...");

    // Update all QUARTERLY services to TERTIARY
    const updateResult = await prisma.utilityService.updateMany({
      where: {
        billingFrequency: "QUARTERLY",
      },
      data: {
        billingFrequency: "TERTIARY",
      },
    });

    console.log(
      `✅ Updated ${updateResult.count} utility services to TERTIARY billing frequency`
    );

    // Verify the changes
    console.log("\n📊 Current utility services after update:");
    const updatedServices = await prisma.utilityService.findMany({
      select: {
        name: true,
        serviceType: true,
        billingFrequency: true,
        billingInterval: true,
        isActive: true,
      },
    });

    for (const service of updatedServices) {
      console.log(
        `  ✅ ${service.name} (${service.serviceType}): ${
          service.billingFrequency
        } ${
          service.billingInterval
            ? `| Interval: ${service.billingInterval}`
            : ""
        }`
      );
    }

    console.log("\n🎉 Billing frequency update completed successfully!");
  } catch (error) {
    console.error("❌ Error updating billing frequency:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateBillingFrequencyToTertiary();
