import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { PDFGenerator } from "../lib/pdfGenerator";
import { notificationService } from "../lib/notificationService";

const router = Router();

// GET /api/invoices - Get invoices
router.get("/", async (req, res, next) => {
  try {
    const { householdId, periodId } = req.query;

    // Role-based filtering
    let householdFilter = {};
    if (req.user?.role === "MEMBER" && req.user?.householdId) {
      householdFilter = { householdId: req.user.householdId };
    } else if (householdId) {
      householdFilter = { householdId: householdId as string };
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        ...householdFilter,
        ...(periodId && { billingPeriodId: periodId as string }),
      },
      include: {
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
          },
        },
        billingPeriod: {
          select: {
            id: true,
            periodName: true,
            startDate: true,
            endDate: true,
          },
        },
        payments: true,
      },
      orderBy: [
        { billingPeriod: { startDate: "desc" } },
        { household: { householdNumber: "asc" } },
      ],
    });

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/invoices/:id - Get specific invoice
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        billingPeriod: {
          select: {
            id: true,
            periodName: true,
            startDate: true,
            endDate: true,
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Faktura hittades inte",
      });
    }

    // Role-based access control
    if (
      req.user?.role === "MEMBER" &&
      req.user?.householdId !== invoice.householdId
    ) {
      return res.status(403).json({
        success: false,
        message: "Tillgång nekad. Du kan endast se dina egna fakturor.",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/invoices/:id/pdf - Generate PDF for invoice
router.get("/:id/pdf", async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            householdNumber: true,
            ownerName: true,
            email: true,
            address: true,
          },
        },
        billingPeriod: {
          select: {
            periodName: true,
            startDate: true,
            endDate: true,
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Faktura hittades inte",
      });
    }

    // Role-based access control
    if (
      req.user?.role === "MEMBER" &&
      req.user?.householdId !== invoice.householdId
    ) {
      return res.status(403).json({
        success: false,
        message: "Tillgång nekad. Du kan endast se dina egna fakturor.",
      });
    }

    // Get utility billing details for this invoice
    const utilityBilling = await prisma.utilityBilling.findMany({
      where: {
        householdId: invoice.householdId,
        billingPeriodId: invoice.billingPeriodId,
      },
      include: {
        service: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
    });

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateInvoicePDFWithDetails({
      invoice,
      utilityDetails: utilityBilling,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="faktura-${invoice.household.householdNumber}-${invoice.billingPeriod.periodName}.pdf"`
    );
    res.send(pdfBuffer);
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// POST /api/invoices/:id/payments - Add payment to invoice
const addPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().transform((str) => new Date(str)),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/:id/payments", async (req, res, next) => {
  try {
    // Only admins can add payments
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message:
          "Tillgång nekad. Endast administratörer kan registrera betalningar.",
      });
    }

    const { id } = req.params;
    const validatedData = addPaymentSchema.parse(req.body);

    // Verify invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Faktura hittades inte",
      });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: validatedData.amount,
        paymentDate: validatedData.paymentDate,
        paymentMethod: validatedData.paymentMethod,
        referenceNumber: validatedData.referenceNumber,
        notes: validatedData.notes,
      },
    });

    // Check if invoice is now fully paid and update status
    const totalPayments = await prisma.payment.aggregate({
      where: { invoiceId: id },
      _sum: { amount: true },
    });

    const totalPaid = Number(totalPayments._sum.amount || 0);
    const invoiceAmount = Number(invoice.totalAmount);

    let wasJustPaid = false;
    if (totalPaid >= invoiceAmount && invoice.status !== "paid") {
      await prisma.invoice.update({
        where: { id },
        data: {
          status: "paid",
          paidDate: new Date(),
        },
      });
      wasJustPaid = true;
    }

    // Send payment confirmation email if invoice was just fully paid
    if (wasJustPaid) {
      try {
        await notificationService.sendPaymentConfirmation(id);
      } catch (error) {
        console.error("Failed to send payment confirmation email:", error);
        // Don't fail the payment operation if email fails
      }
    }

    res.json({
      success: true,
      data: payment,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// PUT /api/invoices/:id/status - Update invoice status
const updateStatusSchema = z.object({
  status: z.enum(["pending", "paid", "overdue"]),
});

router.put("/:id/status", async (req, res, next) => {
  try {
    // Only admins can update invoice status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message:
          "Tillgång nekad. Endast administratörer kan uppdatera fakturastatus.",
      });
    }

    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const currentInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { status: true },
    });

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        ...(status === "paid" && currentInvoice?.status !== "paid"
          ? { paidDate: new Date() }
          : {}),
      },
      include: {
        household: {
          select: {
            householdNumber: true,
            ownerName: true,
          },
        },
        billingPeriod: {
          select: {
            periodName: true,
          },
        },
      },
    });

    // Send payment confirmation email if status changed to paid
    if (status === "paid" && currentInvoice?.status !== "paid") {
      try {
        await notificationService.sendPaymentConfirmation(id);
      } catch (error) {
        console.error("Failed to send payment confirmation email:", error);
        // Don't fail the status update if email fails
      }
    }

    res.json({
      success: true,
      data: invoice,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
