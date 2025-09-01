import cron from "node-cron";
import { notificationService } from "./notificationService";
import { emailService } from "./emailService";

export class SchedulerService {
  private isInitialized = false;

  /**
   * Initialize all scheduled tasks
   */
  init(): void {
    if (this.isInitialized) {
      console.log("Scheduler already initialized");
      return;
    }

    // Schedule daily payment reminders at 9:00 AM
    cron.schedule(
      "0 9 * * *",
      async () => {
        console.log("🕘 Running daily payment reminders...");
        try {
          await notificationService.sendPaymentReminders();
          await emailService.processQueue();
          console.log("✅ Daily payment reminders completed");
        } catch (error) {
          console.error("❌ Failed to run daily payment reminders:", error);
        }
      },
      {
        timezone: "Europe/Stockholm",
      }
    );

    // Schedule advance meter reading reminders at 10:00 AM daily
    cron.schedule(
      "0 10 * * *",
      async () => {
        console.log("🕙 Running advance meter reading reminders...");
        try {
          await notificationService.sendMeterReadingAdvanceReminders();
          await emailService.processQueue();
          console.log("✅ Advance meter reading reminders completed");
        } catch (error) {
          console.error(
            "❌ Failed to run advance meter reading reminders:",
            error
          );
        }
      },
      {
        timezone: "Europe/Stockholm",
      }
    );

    // Schedule overdue meter reading reminders at 11:00 AM daily
    cron.schedule(
      "0 11 * * *",
      async () => {
        console.log("🕚 Running overdue meter reading reminders...");
        try {
          await notificationService.sendMeterReadingOverdueReminders();
          await emailService.processQueue();
          console.log("✅ Overdue meter reading reminders completed");
        } catch (error) {
          console.error(
            "❌ Failed to run overdue meter reading reminders:",
            error
          );
        }
      },
      {
        timezone: "Europe/Stockholm",
      }
    );

    // Process email queue every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      try {
        await emailService.processQueue();
      } catch (error) {
        console.error("Failed to process email queue:", error);
      }
    });

    // Cleanup old email queue entries weekly (Sunday at 2:00 AM)
    cron.schedule(
      "0 2 * * 0",
      async () => {
        console.log("🧹 Cleaning up old email queue entries...");
        try {
          await this.cleanupEmailQueue();
          console.log("✅ Email queue cleanup completed");
        } catch (error) {
          console.error("❌ Failed to cleanup email queue:", error);
        }
      },
      {
        timezone: "Europe/Stockholm",
      }
    );

    this.isInitialized = true;
    console.log("📅 Email notification scheduler initialized");
    console.log("   • Daily payment reminders at 9:00 AM");
    console.log("   • Advance meter reading reminders at 10:00 AM");
    console.log("   • Overdue meter reading reminders at 11:00 AM");
    console.log("   • Email queue processing every 5 minutes");
    console.log("   • Weekly cleanup on Sundays at 2:00 AM");
  }

  /**
   * Cleanup old sent emails and failed emails (keep for 30 days)
   */
  private async cleanupEmailQueue(): Promise<void> {
    const { prisma } = await import("./prisma");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.emailQueue.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: ["SENT", "FAILED", "CANCELLED"] },
      },
    });

    console.log(`Cleaned up ${result.count} old email queue entries`);
  }

  /**
   * Manual trigger for payment reminders (for testing or admin use)
   */
  async triggerPaymentReminders(): Promise<void> {
    console.log("📧 Manually triggering payment reminders...");
    await notificationService.sendPaymentReminders();
    await emailService.processQueue();
  }

  /**
   * Manual trigger for meter reading reminders (for testing or admin use)
   */
  async triggerMeterReadingReminders(
    reminderType: "advance" | "overdue" = "advance",
    billingPeriodId?: string
  ): Promise<void> {
    console.log(
      `📧 Manually triggering ${reminderType} meter reading reminders...`
    );
    await notificationService.triggerMeterReadingReminders(
      billingPeriodId,
      reminderType
    );
    await emailService.processQueue();
  }

  /**
   * Get scheduler status
   */
  getStatus(): { initialized: boolean; scheduledTasks: number } {
    return {
      initialized: this.isInitialized,
      scheduledTasks: cron.getTasks().size,
    };
  }
}

export const schedulerService = new SchedulerService();
