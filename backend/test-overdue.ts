import { prisma } from "./src/lib/prisma";

async function createOverdueInvoice() {
  try {
    // Update an invoice to be overdue
    const invoice = await prisma.invoice.update({
      where: { id: "3998e0bf-ea51-49f8-a02d-5e41fc9a9b4f" },
      data: {
        dueDate: new Date("2025-08-15"),
        status: "overdue",
      },
    });

    console.log("Updated invoice:", invoice.invoiceNumber, "to be overdue");

    // Also ensure the household has notifications enabled
    const household = await prisma.household.findUnique({
      where: { id: invoice.householdId },
      include: { notificationSettings: true },
    });

    if (household && !household.notificationSettings) {
      await prisma.notificationSettings.create({
        data: {
          householdId: household.id,
          emailEnabled: true,
          newInvoiceNotification: true,
          paymentReminderEnabled: true,
          paymentConfirmationEnabled: true,
        },
      });
      console.log(
        "Created notification settings for household",
        household.householdNumber
      );
    } else if (household?.notificationSettings) {
      await prisma.notificationSettings.update({
        where: { householdId: household.id },
        data: { paymentReminderEnabled: true },
      });
      console.log(
        "Enabled payment reminders for household",
        household.householdNumber
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createOverdueInvoice();
