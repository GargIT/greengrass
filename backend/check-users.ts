import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    console.log('👥 Found users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Active: ${user.isActive} - Name: ${user.firstName} ${user.lastName}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
