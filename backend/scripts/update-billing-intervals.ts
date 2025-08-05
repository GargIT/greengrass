import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateBillingIntervals() {
  console.log("Updating billing intervals for existing services...");

  // Update all services to use the new billingInterval field
  // Based on the current billingFrequency values
  const services = await prisma.utilityService.findMany();

  for (const service of services) {
    let billingInterval;

    // Map from old billingFrequency to new billingInterval
    switch (service.billingFrequency) {
      case "MONTHLY":
        billingInterval = "MONTHLY";
        break;
      case "QUARTERLY":
        billingInterval = "QUARTERLY";
        break;
      case "TERTIARY":
        billingInterval = "TERTIARY"; // This is what Gröngräset actually uses
        break;
      case "ANNUALLY":
        billingInterval = "ANNUALLY";
        break;
      default:
        billingInterval = "TERTIARY"; // Default for Gröngräset
    }

    await prisma.utilityService.update({
      where: { id: service.id },
      data: { billingInterval },
    });

    console.log(
      `Updated ${service.name}: ${service.billingFrequency} -> ${billingInterval}`
    );
  }

  console.log("✅ All services updated with billing intervals");
}

updateBillingIntervals()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
