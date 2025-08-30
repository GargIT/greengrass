import { emailService } from "./emailService";
import { prisma } from "./prisma";

export class NotificationService {
  /**
   * Send new invoice notifications to all households
   */
  async sendNewInvoiceNotifications(billingPeriodId: string): Promise<void> {
    console.log(
      `Sending new invoice notifications for billing period: ${billingPeriodId}`
    );

    // Get all invoices for this billing period
    const invoices = await prisma.invoice.findMany({
      where: { billingPeriodId },
      include: {
        household: { include: { notificationSettings: true } },
        billingPeriod: true,
      },
    });

    const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    for (const invoice of invoices) {
      if (!invoice.household.email) {
        console.log(
          `Skipping notification for household ${invoice.household.householdNumber} - no email`
        );
        continue;
      }

      try {
        await emailService.sendNotificationToHousehold(
          invoice.household.id,
          "new_invoice",
          {
            invoiceNumber: invoice.invoiceNumber,
            periodName: invoice.billingPeriod.periodName,
            dueDate: this.formatDate(invoice.dueDate),
            totalAmount: this.formatCurrency(invoice.totalAmount),
            loginUrl,
          },
          "newInvoiceNotification"
        );

        console.log(
          `✅ New invoice notification sent to household ${invoice.household.householdNumber}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to send new invoice notification to household ${invoice.household.householdNumber}:`,
          error
        );
      }
    }
  }

  /**
   * Send payment reminders for overdue invoices
   */
  async sendPaymentReminders(): Promise<void> {
    console.log("Sending payment reminders for overdue invoices...");

    // Get overdue unpaid invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["pending", "overdue"] },
        dueDate: { lt: new Date() },
      },
      include: {
        household: { include: { notificationSettings: true } },
        billingPeriod: true,
      },
    });

    const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    for (const invoice of overdueInvoices) {
      if (!invoice.household.email) {
        continue;
      }

      const daysOverdue = Math.floor(
        (Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should send reminder based on household settings
      const settings = invoice.household.notificationSettings;
      if (!settings?.paymentReminderEnabled) {
        continue;
      }

      try {
        await emailService.sendNotificationToHousehold(
          invoice.household.id,
          "payment_reminder",
          {
            invoiceNumber: invoice.invoiceNumber,
            periodName: invoice.billingPeriod.periodName,
            dueDate: this.formatDate(invoice.dueDate),
            daysOverdue: daysOverdue.toString(),
            totalAmount: this.formatCurrency(invoice.totalAmount),
            loginUrl,
          },
          "paymentReminderEnabled"
        );

        console.log(
          `✅ Payment reminder sent to household ${invoice.household.householdNumber} (${daysOverdue} days overdue)`
        );
      } catch (error) {
        console.error(
          `❌ Failed to send payment reminder to household ${invoice.household.householdNumber}:`,
          error
        );
      }
    }
  }

  /**
   * Send payment confirmation when invoice is marked as paid
   */
  async sendPaymentConfirmation(invoiceId: string): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        household: { include: { notificationSettings: true } },
        billingPeriod: true,
      },
    });

    if (!invoice || !invoice.household.email) {
      return;
    }

    try {
      await emailService.sendNotificationToHousehold(
        invoice.household.id,
        "payment_confirmation",
        {
          invoiceNumber: invoice.invoiceNumber,
          periodName: invoice.billingPeriod.periodName,
          totalAmount: this.formatCurrency(invoice.totalAmount),
          paymentDate: this.formatDate(invoice.paidDate || new Date()),
        },
        "paymentConfirmationEnabled"
      );

      console.log(
        `✅ Payment confirmation sent to household ${invoice.household.householdNumber}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to send payment confirmation to household ${invoice.household.householdNumber}:`,
        error
      );
    }
  }

  /**
   * Create default notification settings for a household
   */
  async createDefaultNotificationSettings(householdId: string): Promise<void> {
    await prisma.notificationSettings.create({
      data: {
        householdId,
        emailEnabled: true,
        newInvoiceNotification: true,
        paymentReminderEnabled: true,
        paymentConfirmationEnabled: true,
        reminderDaysBefore: 7,
        monthlySummaryEnabled: false,
      },
    });
  }

  /**
   * Update notification settings for a household
   */
  async updateNotificationSettings(
    householdId: string,
    settings: Partial<{
      emailEnabled: boolean;
      newInvoiceNotification: boolean;
      paymentReminderEnabled: boolean;
      paymentConfirmationEnabled: boolean;
      reminderDaysBefore: number;
      monthlySummaryEnabled: boolean;
    }>
  ): Promise<void> {
    await prisma.notificationSettings.upsert({
      where: { householdId },
      update: settings,
      create: {
        householdId,
        emailEnabled: settings.emailEnabled ?? true,
        newInvoiceNotification: settings.newInvoiceNotification ?? true,
        paymentReminderEnabled: settings.paymentReminderEnabled ?? true,
        paymentConfirmationEnabled: settings.paymentConfirmationEnabled ?? true,
        reminderDaysBefore: settings.reminderDaysBefore ?? 7,
        monthlySummaryEnabled: settings.monthlySummaryEnabled ?? false,
      },
    });
  }

  /**
   * Schedule daily payment reminders (to be called by cron job)
   */
  async scheduleDailyReminders(): Promise<void> {
    await this.sendPaymentReminders();
    await emailService.processQueue();
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString("sv-SE");
  }

  private formatCurrency(amount: number | any): string {
    const numericAmount = typeof amount === "number" ? amount : Number(amount);
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(numericAmount);
  }
}

export const notificationService = new NotificationService();
