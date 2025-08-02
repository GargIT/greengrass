import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create utility services
  const waterService = await prisma.utilityService.upsert({
    where: { name: 'Water' },
    update: {},
    create: {
      name: 'Water',
      unit: 'm³',
      hasMainMeters: true,
      mainMeterCount: 2,
      readingFrequency: 3,
      requiresReconciliation: true,
    },
  });

  const electricityService = await prisma.utilityService.upsert({
    where: { name: 'Electricity' },
    update: {},
    create: {
      name: 'Electricity',
      unit: 'kWh',
      hasMainMeters: true,
      mainMeterCount: 1,
      readingFrequency: 4,
      requiresReconciliation: true,
    },
  });

  console.log('✅ Created utility services');

  // Create main meters for water
  await prisma.mainMeter.upsert({
    where: { meterIdentifier: 'Water Main 1' },
    update: {},
    create: {
      serviceId: waterService.id,
      meterIdentifier: 'Water Main 1',
      meterSerial: 'WM001',
      installationDate: new Date('2020-01-01'),
    },
  });

  await prisma.mainMeter.upsert({
    where: { meterIdentifier: 'Water Main 2' },
    update: {},
    create: {
      serviceId: waterService.id,
      meterIdentifier: 'Water Main 2',
      meterSerial: 'WM002',
      installationDate: new Date('2020-01-01'),
    },
  });

  // Create main meter for electricity
  await prisma.mainMeter.upsert({
    where: { meterIdentifier: 'Electricity Main' },
    update: {},
    create: {
      serviceId: electricityService.id,
      meterIdentifier: 'Electricity Main',
      meterSerial: 'EM001',
      installationDate: new Date('2020-01-01'),
    },
  });

  console.log('✅ Created main meters');

  // Create 14 households
  const households = [];
  for (let i = 1; i <= 14; i++) {
    const household = await prisma.household.upsert({
      where: { householdNumber: i },
      update: {},
      create: {
        householdNumber: i,
        ownerName: `Household ${i} Owner`,
        email: `household${i}@grongrasset.se`,
        phone: `070-123-${i.toString().padStart(4, '0')}`,
        address: `Gröngräset ${i}`,
        andelstal: 1/14, // Equal shares
        annualMemberFee: 3000,
      },
    });
    households.push(household);

    // Create household meters for each service
    await prisma.householdMeter.upsert({
      where: {
        householdId_serviceId: {
          householdId: household.id,
          serviceId: waterService.id,
        },
      },
      update: {},
      create: {
        householdId: household.id,
        serviceId: waterService.id,
        meterSerial: `WH${i.toString().padStart(3, '0')}`,
        installationDate: new Date('2020-01-01'),
      },
    });

    await prisma.householdMeter.upsert({
      where: {
        householdId_serviceId: {
          householdId: household.id,
          serviceId: electricityService.id,
        },
      },
      update: {},
      create: {
        householdId: household.id,
        serviceId: electricityService.id,
        meterSerial: `EH${i.toString().padStart(3, '0')}`,
        installationDate: new Date('2020-01-01'),
      },
    });
  }

  console.log('✅ Created 14 households with meters');

  // Create utility pricing
  await prisma.utilityPricing.upsert({
    where: {
      serviceId_effectiveDate: {
        serviceId: waterService.id,
        effectiveDate: new Date('2025-01-01'),
      },
    },
    update: {},
    create: {
      serviceId: waterService.id,
      effectiveDate: new Date('2025-01-01'),
      pricePerUnit: 45.50,
      fixedFeeTotal: 2400, // SEK per quarter for all households
      fixedFeePerHousehold: 2400 / 14, // SEK per household per quarter
      notes: 'Water pricing including subscription fee',
    },
  });

  await prisma.utilityPricing.upsert({
    where: {
      serviceId_effectiveDate: {
        serviceId: electricityService.id,
        effectiveDate: new Date('2025-01-01'),
      },
    },
    update: {},
    create: {
      serviceId: electricityService.id,
      effectiveDate: new Date('2025-01-01'),
      pricePerUnit: 1.85,
      fixedFeeTotal: 840, // SEK per quarter for all households
      fixedFeePerHousehold: 840 / 14, // SEK per household per quarter
      notes: 'Electricity pricing including grid connection fee',
    },
  });

  console.log('✅ Created utility pricing');

  // Create billing periods for 2025
  const billingPeriods = [
    // Official quarterly periods
    {
      periodName: '2025-Q1',
      periodType: 'quarterly' as const,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-04-30'),
      isOfficialBilling: true,
      isBillingEnabled: true,
      isReconciliationEnabled: true,
      readingDeadline: new Date('2025-01-31'),
      billingDeadline: new Date('2025-02-15'),
    },
    {
      periodName: '2025-Q2',
      periodType: 'quarterly' as const,
      startDate: new Date('2025-05-01'),
      endDate: new Date('2025-08-31'),
      isOfficialBilling: true,
      isBillingEnabled: true,
      isReconciliationEnabled: true,
      readingDeadline: new Date('2025-05-31'),
      billingDeadline: new Date('2025-06-15'),
    },
    {
      periodName: '2025-Q3',
      periodType: 'quarterly' as const,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-31'),
      isOfficialBilling: true,
      isBillingEnabled: true,
      isReconciliationEnabled: true,
      readingDeadline: new Date('2025-09-30'),
      billingDeadline: new Date('2025-10-15'),
    },
    // Some optional monthly periods
    {
      periodName: '2025-02',
      periodType: 'monthly' as const,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-28'),
      isOfficialBilling: false,
      isBillingEnabled: true,
      isReconciliationEnabled: false,
      readingDeadline: new Date('2025-02-28'),
      billingDeadline: new Date('2025-03-05'),
    },
    {
      periodName: '2025-03',
      periodType: 'monthly' as const,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-31'),
      isOfficialBilling: false,
      isBillingEnabled: false,
      isReconciliationEnabled: false,
      readingDeadline: new Date('2025-03-31'),
      billingDeadline: null,
    },
  ];

  for (const period of billingPeriods) {
    await prisma.billingPeriod.upsert({
      where: { periodName: period.periodName },
      update: {},
      create: period,
    });
  }

  console.log('✅ Created billing periods');

  // Create some shared costs
  await prisma.sharedCost.upsert({
    where: {
      year_quarter_description: {
        year: 2025,
        quarter: 1,
        description: 'Building Maintenance',
      },
    },
    update: {},
    create: {
      year: 2025,
      quarter: 1,
      description: 'Building Maintenance',
      totalAmount: 14000,
      costPerHousehold: 1000,
      category: 'Maintenance',
    },
  });

  await prisma.sharedCost.upsert({
    where: {
      year_quarter_description: {
        year: 2025,
        quarter: 1,
        description: 'Insurance',
      },
    },
    update: {},
    create: {
      year: 2025,
      quarter: 1,
      description: 'Insurance',
      totalAmount: 7000,
      costPerHousehold: 500,
      category: 'Insurance',
    },
  });

  console.log('✅ Created shared costs');

  // Get the first billing period to use for sample bills
  const firstBillingPeriod = await prisma.billingPeriod.findFirst({
    where: { periodName: '2025-Q1' }
  });

  if (!firstBillingPeriod) {
    throw new Error('No billing period found for creating sample bills');
  }

  // Create sample bills and payments
  const householdsWithMeters = await prisma.household.findMany({
    include: {
      householdMeters: true,
    },
  });

  for (const household of householdsWithMeters) {
    // Create a quarterly bill for each household for the first billing period
    const quarterlyBill = await prisma.quarterlyBill.create({
      data: {
        householdId: household.id,
        billingPeriodId: firstBillingPeriod.id,
        memberFee: 1000.00,
        totalUtilityCosts: 0,
        sharedCosts: 0,
        totalAmount: 1000.00,
        dueDate: new Date('2025-02-15'),
        status: 'pending',
      },
    });

    // Create a payment for each bill
    await prisma.payment.create({
      data: {
        quarterlyBillId: quarterlyBill.id,
        amount: 0,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
      },
    });
  }

  console.log('✅ Created sample bills and payments');

  // Create test users
  const bcrypt = require('bcryptjs');
  
  // Get the first household for admin user
  const firstHousehold = await prisma.household.findFirst({
    where: { householdNumber: 1 }
  });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@grongrasset.se' },
    update: {},
    create: {
      email: 'admin@grongrasset.se',
      password: await bcrypt.hash('admin123', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      householdId: null, // Admin not tied to specific household
    },
  });

  // Create member user for household 1
  const memberUser = await prisma.user.upsert({
    where: { email: 'member@grongrasset.se' },
    update: {},
    create: {
      email: 'member@grongrasset.se',
      password: await bcrypt.hash('member123', 12),
      firstName: 'John',
      lastName: 'Doe',
      role: 'MEMBER',
      householdId: firstHousehold?.id,
    },
  });

  console.log('✅ Created test users:');
  console.log('   Admin: admin@grongrasset.se / admin123');
  console.log('   Member: member@grongrasset.se / member123');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
