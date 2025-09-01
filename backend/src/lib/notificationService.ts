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

  /**
   * Send advance meter reading reminders (before deadline)
   */
  async sendMeterReadingAdvanceReminders(): Promise<void> {
    console.log("Sending advance meter reading reminders...");

    // Find billing periods with reading deadline tomorrow (1 day from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingPeriods = await prisma.billingPeriod.findMany({
      where: {
        readingDeadline: {
          gte: new Date(tomorrow.getTime() - 24 * 60 * 60 * 1000), // Start of day tomorrow
          lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000), // End of day tomorrow
        },
      },
    });

    for (const period of upcomingPeriods) {
      await this.sendMeterReadingRemindersForPeriod(period.id, false);
    }
  }

  /**
   * Send overdue meter reading reminders (after deadline)
   */
  async sendMeterReadingOverdueReminders(): Promise<void> {
    console.log("Sending overdue meter reading reminders...");

    // Find billing periods where deadline has passed
    const overduePeriodsResult = await prisma.billingPeriod.findMany({
      where: {
        readingDeadline: { lt: new Date() },
      },
    });

    for (const period of overduePeriodsResult) {
      // Check if we should send reminder
      const daysSinceDeadline = Math.floor(
        (Date.now() - period.readingDeadline.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send on day 1 (first day after deadline), then every other day (day 3, 5, 7, etc.)
      if (
        daysSinceDeadline === 1 ||
        (daysSinceDeadline > 1 && daysSinceDeadline % 2 === 1)
      ) {
        await this.sendMeterReadingRemindersForPeriod(period.id, true);
      }
    }
  }

  /**
   * Send meter reading reminders for a specific billing period
   */
  async sendMeterReadingRemindersForPeriod(
    billingPeriodId: string,
    isOverdue: boolean = false
  ): Promise<void> {
    const billingPeriod = await prisma.billingPeriod.findUnique({
      where: { id: billingPeriodId },
    });

    if (!billingPeriod) {
      console.error(`Billing period ${billingPeriodId} not found`);
      return;
    }

    // Get households that are missing meter readings
    const activeHouseholds = await prisma.household.findMany({
      where: { isActive: true },
      include: {
        notificationSettings: true,
        householdMeters: {
          include: {
            service: true,
            readings: {
              where: { billingPeriodId },
            },
          },
        },
      },
    });

    const loginUrl = process.env.FRONTEND_URL || "http://localhost:5174";

    for (const household of activeHouseholds) {
      if (!household.email) {
        continue;
      }

      // Check notification settings
      const settings = household.notificationSettings;
      if (!settings?.emailEnabled || !settings?.newInvoiceNotification) {
        continue; // Use same setting as invoice notifications for now
      }

      // Find missing meter readings (exclude MEMBERSHIP service)
      const metersRequiringReadings = household.householdMeters.filter(
        (meter) =>
          meter.service.requiresReadings &&
          meter.service.serviceType !== "MEMBERSHIP"
      );

      const missingReadings = metersRequiringReadings.filter(
        (meter) => meter.readings.length === 0
      );

      if (missingReadings.length === 0) {
        continue; // This household has all readings
      }

      const missingServices = missingReadings.map(
        (meter) => meter.service.name
      );

      try {
        const templateName = isOverdue
          ? "meter_reading_urgent"
          : "meter_reading_reminder";

        let templateData: any = {
          ownerName: household.ownerName,
          householdNumber: household.householdNumber.toString(),
          periodName: billingPeriod.periodName,
          readingDeadline: this.formatDate(billingPeriod.readingDeadline),
          missingServices: missingServices
            .map((service) => `- ${service}`)
            .join("\n"),
          missingServicesHtml: missingServices
            .map((service) => `<li>${service}</li>`)
            .join(""),
          loginUrl,
        };

        if (isOverdue) {
          const daysOverdue = Math.floor(
            (Date.now() - billingPeriod.readingDeadline.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          templateData.daysOverdue = daysOverdue.toString();
        } else {
          const daysUntilDeadline = Math.floor(
            (billingPeriod.readingDeadline.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          );
          templateData.daysUntilDeadline = daysUntilDeadline.toString();
        }

        await emailService.sendNotificationToHousehold(
          household.id,
          templateName,
          templateData,
          "newInvoiceNotification" // Use same setting as invoice notifications
        );

        const reminderType = isOverdue ? "överdue" : "advance";
        console.log(
          `✅ Meter reading ${reminderType} reminder sent to household ${household.householdNumber} for period ${billingPeriod.periodName}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to send meter reading reminder to household ${household.householdNumber}:`,
          error
        );
      }
    }
  }

  /**
   * Manual trigger for meter reading reminders (for testing or admin use)
   */
  async triggerMeterReadingReminders(
    billingPeriodId?: string,
    reminderType: "advance" | "overdue" = "advance"
  ): Promise<void> {
    console.log(
      `📧 Manually triggering ${reminderType} meter reading reminders...`
    );

    if (billingPeriodId) {
      await this.sendMeterReadingRemindersForPeriod(
        billingPeriodId,
        reminderType === "overdue"
      );
    } else {
      if (reminderType === "advance") {
        await this.sendMeterReadingAdvanceReminders();
      } else {
        await this.sendMeterReadingOverdueReminders();
      }
    }

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
