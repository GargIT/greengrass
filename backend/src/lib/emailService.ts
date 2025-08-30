import nodemailer from "nodemailer";
import { prisma } from "./prisma";

export interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  templateData?: any;
  scheduledFor?: Date;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[];
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Queue an email for sending
   */
  async queueEmail(options: EmailOptions): Promise<string> {
    const emailQueue = await prisma.emailQueue.create({
      data: {
        to: options.to,
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
        templateId: options.templateId,
        templateData: options.templateData,
        scheduledFor: options.scheduledFor,
      },
    });

    // If not scheduled for later, try to send immediately
    if (!options.scheduledFor || options.scheduledFor <= new Date()) {
      this.processQueue().catch(console.error);
    }

    return emailQueue.id;
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    templateName: string,
    to: string,
    data: Record<string, any>,
    scheduledFor?: Date
  ): Promise<string> {
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName, isActive: true },
    });

    if (!template) {
      throw new Error(`Email template '${templateName}' not found or inactive`);
    }

    // Replace variables in template
    const subject = this.replaceVariables(template.subject, data);
    const htmlContent = this.replaceVariables(template.htmlContent, data);
    const textContent = template.textContent
      ? this.replaceVariables(template.textContent, data)
      : undefined;

    return this.queueEmail({
      to,
      subject,
      htmlContent,
      textContent,
      templateId: template.id,
      templateData: data,
      scheduledFor,
    });
  }

  /**
   * Process email queue
   */
  async processQueue(): Promise<void> {
    const pendingEmails = await prisma.emailQueue.findMany({
      where: {
        status: "PENDING",
        attempts: { lt: 3 },
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: 10, // Process max 10 emails at a time
    });

    for (const email of pendingEmails) {
      await this.sendQueuedEmail(email.id);
    }
  }

  /**
   * Send a specific queued email
   */
  private async sendQueuedEmail(emailId: string): Promise<void> {
    const email = await prisma.emailQueue.findUnique({
      where: { id: emailId },
    });

    if (!email || email.status !== "PENDING") {
      return;
    }

    try {
      // Update status to SENDING
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: { status: "SENDING", attempts: { increment: 1 } },
      });

      // Send email
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@grongraset.se",
        to: email.to,
        subject: email.subject,
        html: email.htmlContent,
        text: email.textContent || undefined,
      });

      // Mark as sent
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: { status: "SENT", sentAt: new Date() },
      });

      console.log(`Email sent successfully to ${email.to}`);
    } catch (error) {
      console.error(`Failed to send email to ${email.to}:`, error);

      // Update with error
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          status: email.attempts >= 2 ? "FAILED" : "PENDING",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  /**
   * Replace variables in template content
   */
  private replaceVariables(content: string, data: Record<string, any>): string {
    let result = content;

    // Replace {{variable}} patterns
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      result = result.replace(regex, String(data[key] || ""));
    });

    return result;
  }

  /**
   * Create or update email template
   */
  async createTemplate(template: EmailTemplate): Promise<void> {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: template.variables,
      },
      create: {
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: template.variables,
      },
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email configuration test failed:", error);
      return false;
    }
  }

  /**
   * Send notification based on household settings
   */
  async sendNotificationToHousehold(
    householdId: string,
    templateName: string,
    data: Record<string, any>,
    notificationType:
      | "newInvoiceNotification"
      | "paymentReminderEnabled"
      | "paymentConfirmationEnabled"
  ): Promise<boolean> {
    // Get household and notification settings
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: { notificationSettings: true },
    });

    if (!household?.email) {
      console.log(`No email address for household ${householdId}`);
      return false;
    }

    // Check if notifications are enabled
    const settings = household.notificationSettings;
    if (!settings?.emailEnabled || !settings[notificationType]) {
      console.log(
        `Notifications disabled for household ${householdId}, type: ${notificationType}`
      );
      return false;
    }

    try {
      await this.sendTemplateEmail(templateName, household.email, {
        ...data,
        householdNumber: household.householdNumber,
        ownerName: household.ownerName,
      });
      return true;
    } catch (error) {
      console.error(
        `Failed to send notification to household ${householdId}:`,
        error
      );
      return false;
    }
  }
}

export const emailService = new EmailService();
