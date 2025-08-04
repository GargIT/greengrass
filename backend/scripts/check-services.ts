import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    console.log("🔍 Checking utility services...\n");

    const services = await prisma.utilityService.findMany({
      select: {
        id: true,
        name: true,
        serviceType: true,
        description: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    console.log("Services found:", services.length);
    console.log("=====================================");

    services.forEach((service) => {
      console.log(`📋 ${service.name}`);
      console.log(`   Type: ${service.serviceType}`);
      console.log(`   Description: ${service.description || "N/A"}`);
      console.log(`   Active: ${service.isActive}`);
      console.log(`   ID: ${service.id}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
