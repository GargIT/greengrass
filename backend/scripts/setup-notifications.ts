import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupNotificationSettings() {
  console.log(
    "📧 Creating default notification settings for all households..."
  );

  const households = await prisma.household.findMany();
  console.log(`Found ${households.length} households`);

  for (const household of households) {
    try {
      // Check if settings already exist
      const existing = await prisma.notificationSettings.findUnique({
        where: { householdId: household.id },
      });

      if (existing) {
        console.log(
          `⚠️  Notification settings already exist for household ${household.householdNumber}`
        );
        continue;
      }

      // Create default settings
      await prisma.notificationSettings.create({
        data: {
          householdId: household.id,
          emailEnabled: true,
          newInvoiceNotification: true,
          paymentReminderEnabled: true,
          paymentConfirmationEnabled: true,
          reminderDaysBefore: 7,
        },
      });

      console.log(
        `✅ Created notification settings for household ${household.householdNumber}`
      );
    } catch (error) {
      console.error(
        `❌ Error creating settings for household ${household.householdNumber}:`,
        error
      );
    }
  }

  // Create default email templates if they don't exist
  console.log("\n📧 Creating default email templates...");

  const templates = [
    {
      name: "new_invoice",
      subject: "Ny faktura från {{householdNumber}} - Gröngräset",
      htmlContent: `
        <h2>Ny faktura tillgänglig</h2>
        <p>Hej,</p>
        <p>En ny faktura för period {{billingPeriod}} är nu tillgänglig.</p>
        <p><strong>Fakturabelopp:</strong> {{amount}} SEK</p>
        <p><strong>Förfallodatum:</strong> {{dueDate}}</p>
        <p>Logga in på systemet för att se detaljer och betala din faktura.</p>
        <p>Med vänliga hälsningar,<br>Gröngräset Samfällighetsförening</p>
      `,
    },
    {
      name: "payment_reminder",
      subject: "Påminnelse: Obetald faktura - Gröngräset",
      htmlContent: `
        <h2>Påminnelse om obetald faktura</h2>
        <p>Hej,</p>
        <p>Din faktura för period {{billingPeriod}} har ännu inte betalats.</p>
        <p><strong>Fakturabelopp:</strong> {{amount}} SEK</p>
        <p><strong>Förfallodatum:</strong> {{dueDate}}</p>
        <p>Vänligen betala snarast för att undvika påminnelseavgifter.</p>
        <p>Med vänliga hälsningar,<br>Gröngräset Samfällighetsförening</p>
      `,
    },
    {
      name: "payment_confirmation",
      subject: "Betalning mottagen - Gröngräset",
      htmlContent: `
        <h2>Betalning bekräftad</h2>
        <p>Hej,</p>
        <p>Vi har mottagit din betalning för faktura {{invoiceNumber}}.</p>
        <p><strong>Betalat belopp:</strong> {{amount}} SEK</p>
        <p><strong>Betalningsdatum:</strong> {{paidDate}}</p>
        <p>Tack för din betalning!</p>
        <p>Med vänliga hälsningar,<br>Gröngräset Samfällighetsförening</p>
      `,
    },
  ];

  for (const template of templates) {
    try {
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name },
      });

      if (existing) {
        console.log(`⚠️  Email template '${template.name}' already exists`);
        continue;
      }

      await prisma.emailTemplate.create({
        data: template,
      });

      console.log(`✅ Created email template '${template.name}'`);
    } catch (error) {
      console.error(`❌ Error creating template '${template.name}':`, error);
    }
  }

  await prisma.$disconnect();
  console.log("\n🎉 Notification setup complete!");
}

setupNotificationSettings().catch(console.error);
