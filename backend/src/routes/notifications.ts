import { Router } from "express";
import { z } from "zod";
import { emailService } from "../lib/emailService";
import { notificationService } from "../lib/notificationService";
import { prisma } from "../lib/prisma";

const router = Router();

// Test email configuration
router.get("/test", async (req, res, next): Promise<void> => {
  try {
    const isWorking = await emailService.testConnection();
    res.json({
      success: true,
      data: {
        isWorking,
        message: isWorking
          ? "Email service is working"
          : "Email service configuration failed",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error testing email service",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get notification settings for current user's household
router.get("/settings", async (req, res, next): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    let householdId = user.householdId;

    // For admins, allow getting settings for any household via query param
    if (user.role === "ADMIN" && req.query.householdId) {
      householdId = req.query.householdId as string;
    }

    if (!householdId) {
      res
        .status(400)
        .json({ success: false, message: "No household associated with user" });
      return;
    }

    let settings = await prisma.notificationSettings.findUnique({
      where: { householdId },
    });

    // Create default settings if none exist
    if (!settings) {
      await notificationService.createDefaultNotificationSettings(householdId);
      settings = await prisma.notificationSettings.findUnique({
        where: { householdId },
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// Update notification settings
const updateSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  newInvoiceNotification: z.boolean().optional(),
  paymentReminderEnabled: z.boolean().optional(),
  paymentConfirmationEnabled: z.boolean().optional(),
  reminderDaysBefore: z.number().min(1).max(30).optional(),
  monthlySummaryEnabled: z.boolean().optional(),
  householdId: z.string().uuid().optional(), // Only for admins
});

router.put("/settings", async (req, res, next): Promise<void> => {
  try {
    const validatedData = updateSettingsSchema.parse(req.body);
    const user = req.user;

    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    let householdId = user.householdId;

    // For admins, allow updating settings for any household
    if (user.role === "ADMIN" && validatedData.householdId) {
      householdId = validatedData.householdId;
    } else if (
      user.role === "MEMBER" &&
      validatedData.householdId &&
      validatedData.householdId !== user.householdId
    ) {
      res.status(403).json({
        success: false,
        message: "Cannot update settings for other households",
      });
      return;
    }

    if (!householdId) {
      res
        .status(400)
        .json({ success: false, message: "No household associated with user" });
      return;
    }

    // Remove householdId from the data to update
    const { householdId: _, ...settingsToUpdate } = validatedData;

    await notificationService.updateNotificationSettings(
      householdId,
      settingsToUpdate
    );

    const updatedSettings = await prisma.notificationSettings.findUnique({
      where: { householdId },
    });

    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    next(error);
  }
});

// Send test email (admin only)
const testEmailSchema = z.object({
  to: z.string().email(),
  templateName: z.string(),
  testData: z.record(z.any()).optional(),
});

router.post("/test-email", async (req, res, next): Promise<void> => {
  try {
    if (req.user?.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const validatedData = testEmailSchema.parse(req.body);

    const testData = validatedData.testData || {
      ownerName: "Test Användare",
      householdNumber: "999",
      invoiceNumber: "TEST-2024-001",
      periodName: "T1 2024",
      dueDate: "2024-12-31",
      totalAmount: "1,234.56",
      loginUrl: process.env.FRONTEND_URL || "http://localhost:5173",
      paymentDate: "2024-12-25",
      daysOverdue: "5",
    };

    const emailId = await emailService.sendTemplateEmail(
      validatedData.templateName,
      validatedData.to,
      testData
    );

    res.json({
      success: true,
      data: { emailId, message: "Test email queued successfully" },
    });
  } catch (error) {
    next(error);
  }
});

// Process email queue manually (admin only)
router.post("/process-queue", async (req, res, next): Promise<void> => {
  try {
    if (req.user?.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    await emailService.processQueue();

    res.json({
      success: true,
      data: { message: "Email queue processed successfully" },
    });
  } catch (error) {
    next(error);
  }
});

// Send payment reminders manually (admin only)
router.post(
  "/send-payment-reminders",
  async (req, res, next): Promise<void> => {
    try {
      if (req.user?.role !== "ADMIN") {
        res
          .status(403)
          .json({ success: false, message: "Admin access required" });
        return;
      }

      await notificationService.sendPaymentReminders();

      res.json({
        success: true,
        data: { message: "Payment reminders sent successfully" },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get email queue status (admin only)
router.get("/queue-status", async (req, res, next): Promise<void> => {
  try {
    if (req.user?.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const queueStats = await prisma.emailQueue.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const recentEmails = await prisma.emailQueue.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        attempts: true,
        createdAt: true,
        sentAt: true,
        errorMessage: true,
      },
    });

    res.json({
      success: true,
      data: { queueStats, recentEmails },
    });
  } catch (error) {
    next(error);
  }
});

// Get available email templates (admin only)
router.get("/templates", async (req, res, next): Promise<void> => {
  try {
    if (req.user?.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        subject: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

// Send meter reading reminders manually (admin only)
router.post(
  "/send-meter-reading-reminders",
  async (req, res, next): Promise<void> => {
    try {
      if (req.user?.role !== "ADMIN") {
        res
          .status(403)
          .json({ success: false, message: "Admin access required" });
        return;
      }

      const { billingPeriodId, reminderType = "advance" } = req.body;

      await notificationService.triggerMeterReadingReminders(
        billingPeriodId,
        reminderType
      );

      res.json({
        success: true,
        data: {
          message: `Meter reading ${reminderType} reminders sent successfully`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get billing periods for meter reading reminders (admin only)
router.get("/billing-periods", async (req, res, next): Promise<void> => {
  try {
    if (req.user?.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const periods = await prisma.billingPeriod.findMany({
      orderBy: { startDate: "desc" },
      take: 10,
      select: {
        id: true,
        periodName: true,
        periodType: true,
        startDate: true,
        endDate: true,
        readingDeadline: true,
        _count: {
          select: {
            householdMeterReadings: true,
          },
        },
      },
    });

    // Add status information
    const periodsWithStatus = periods.map((period) => {
      const now = new Date();
      const deadline = new Date(period.readingDeadline);

      let status = "upcoming";
      let daysToDeadline = Math.floor(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysToDeadline < 0) {
        status = "overdue";
        daysToDeadline = Math.abs(daysToDeadline);
      } else if (daysToDeadline <= 3) {
        status = "deadline_soon";
      }

      return {
        ...period,
        status,
        daysToDeadline,
        hasReadings: period._count.householdMeterReadings > 0,
      };
    });

    res.json({ success: true, data: periodsWithStatus });
  } catch (error) {
    next(error);
  }
});

export default router;
