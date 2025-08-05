import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createUsersOnly() {
  console.log("👥 Creating test users only...");

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const memberPasswordHash = await bcrypt.hash("member123", 10);

  // Find first household for the member user
  const firstHousehold = await prisma.household.findFirst({
    where: { isActive: true },
    orderBy: { householdNumber: "asc" },
  });

  if (!firstHousehold) {
    console.log("❌ No households found! Please import data first.");
    return;
  }

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@grongraset.se" },
    update: {
      password: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@grongraset.se",
      password: adminPasswordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isActive: true,
    },
  });

  // Create member user linked to first household
  const memberUser = await prisma.user.upsert({
    where: { email: "member@grongraset.se" },
    update: {
      password: memberPasswordHash,
      role: "MEMBER",
      householdId: firstHousehold.id,
      isActive: true,
    },
    create: {
      email: "member@grongraset.se",
      password: memberPasswordHash,
      firstName: "Member",
      lastName: "User",
      role: "MEMBER",
      householdId: firstHousehold.id,
      isActive: true,
    },
  });

  console.log("✅ Created test users:");
  console.log(`   Admin: admin@grongraset.se / admin123`);
  console.log(
    `   Member: member@grongraset.se / member123 (linked to household ${firstHousehold.householdNumber})`
  );
}

async function main() {
  try {
    await createUsersOnly();
    console.log("🎉 User creation completed successfully!");
  } catch (error) {
    console.error("❌ Error creating users:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
