import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { PDFGenerator } from "../lib/pdfGenerator";

const router = Router();

// Validation schemas
const billingPeriodSchema = z.object({
  periodName: z.string().min(1).max(100),
  periodType: z.enum(["quarterly", "monthly"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  readingDeadline: z.string().datetime(),
  isOfficialBilling: z.boolean().optional().default(false),
  isBillingEnabled: z.boolean().optional().default(false),
  isReconciliationEnabled: z.boolean().optional().default(false),
});

const generateBillsSchema = z.object({
  billingPeriodId: z.string().uuid(),
  householdIds: z.array(z.string().uuid()).optional(),
  billType: z.enum(["quarterly", "monthly"]),
});

// GET /api/billing/periods - Get all billing periods
router.get("/periods", async (req, res, next) => {
  try {
    const periods = await prisma.billingPeriod.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: {
            quarterlyBills: true,
            monthlyBills: true,
            householdMeterReadings: true,
            mainMeterReadings: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: periods,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// POST /api/billing/periods - Create billing period
router.post("/periods", async (req, res, next) => {
  try {
    const validatedData = billingPeriodSchema.parse(req.body);

    const period = await prisma.billingPeriod.create({
      data: {
        ...validatedData,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        readingDeadline: new Date(validatedData.readingDeadline),
      },
    });

    res.status(201).json({
      success: true,
      data: period,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/billing/quarterly - Get quarterly bills
router.get("/quarterly", async (req, res, next) => {
  try {
    const { householdId, periodId } = req.query;

    const bills = await prisma.quarterlyBill.findMany({
      where: {
        ...(householdId && { householdId: householdId as string }),
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
      data: bills,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/billing/monthly - Get monthly bills
router.get("/monthly", async (req, res, next) => {
  try {
    const { householdId, periodId } = req.query;

    const bills = await prisma.monthlyBill.findMany({
      where: {
        ...(householdId && { householdId: householdId as string }),
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
      data: bills,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// POST /api/billing/generate - Generate bills for a billing period
router.post("/generate", async (req, res, next) => {
  try {
    const { billingPeriodId, householdIds, billType } =
      generateBillsSchema.parse(req.body);

    // Get billing period
    const billingPeriod = await prisma.billingPeriod.findUnique({
      where: { id: billingPeriodId },
    });

    if (!billingPeriod) {
      return res.status(404).json({
        success: false,
        message: "Billing period not found",
      });
    }

    // Get households to bill
    const households = await prisma.household.findMany({
      where: {
        isActive: true,
        ...(householdIds && { id: { in: householdIds } }),
      },
      include: {
        householdMeters: {
          include: {
            service: {
              include: {
                pricing: {
                  where: {
                    isActive: true,
                    effectiveDate: { lte: billingPeriod.endDate },
                  },
                  orderBy: { effectiveDate: "desc" },
                  take: 1,
                },
              },
            },
            readings: {
              where: { billingPeriodId },
            },
          },
        },
      },
    });

    if (billType === "quarterly") {
      // Generate quarterly bills with shared costs
      const sharedCosts = await prisma.sharedCost.findMany({
        where: {
          year: billingPeriod.startDate.getFullYear(),
          quarter: Math.floor((billingPeriod.startDate.getMonth() + 3) / 3),
        },
      });

      const bills = [];

      for (const household of households) {
        let totalUtilityCosts = 0;
        const utilityDetails = [];

        // Calculate utility costs
        for (const meter of household.householdMeters) {
          const reading = meter.readings[0];
          const pricing = meter.service.pricing[0];

          if (reading && pricing) {
            // Get previous reading for consumption calculation
            const previousReading =
              await prisma.householdMeterReading.findFirst({
                where: {
                  householdMeterId: meter.id,
                  billingPeriod: {
                    endDate: { lt: billingPeriod.startDate },
                  },
                },
                orderBy: { billingPeriod: { endDate: "desc" } },
              });

            const consumption = previousReading
              ? Number(reading.meterReading) -
                Number(previousReading.meterReading)
              : Number(reading.meterReading);

            const variableCost = consumption * Number(pricing.pricePerUnit);
            const fixedCost = Number(pricing.fixedFeePerHousehold);

            totalUtilityCosts += variableCost + fixedCost;

            utilityDetails.push({
              serviceId: meter.serviceId,
              serviceName: meter.service.name,
              consumption,
              variableCost,
              fixedCost,
              meterReading: Number(reading.meterReading),
              previousMeterReading: previousReading
                ? Number(previousReading.meterReading)
                : 0,
            });
          }
        }

        // Calculate shared costs
        const totalSharedCosts = sharedCosts.reduce(
          (sum, cost) => sum + Number(cost.costPerHousehold),
          0
        );

        // Calculate member fee from existing utility billings (MEMBERSHIP service)
        const memberFeeFromUtility = await prisma.utilityBilling.findFirst({
          where: {
            householdId: household.id,
            billingPeriodId,
            service: { serviceType: "MEMBERSHIP" },
          },
        });

        const memberFee = memberFeeFromUtility
          ? Number(memberFeeFromUtility.totalUtilityCost)
          : 0;
        const totalAmount = totalUtilityCosts + totalSharedCosts + memberFee;

        const bill = await prisma.quarterlyBill.create({
          data: {
            householdId: household.id,
            billingPeriodId,
            memberFee,
            totalUtilityCosts,
            sharedCosts: totalSharedCosts,
            totalAmount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            status: "pending",
          },
          include: {
            household: true,
            billingPeriod: true,
          },
        });

        bills.push(bill);
      }

      return res.status(201).json({
        success: true,
        data: bills,
        message: `Generated ${bills.length} quarterly bills`,
      });
    } else {
      // Generate monthly bills (utility only)
      const bills = [];

      for (const household of households) {
        let totalUtilityCosts = 0;
        const utilityDetails = [];

        // Calculate utility costs
        for (const meter of household.householdMeters) {
          const reading = meter.readings[0];
          const pricing = meter.service.pricing[0];

          if (reading && pricing) {
            // Get previous reading for consumption calculation
            const previousReading =
              await prisma.householdMeterReading.findFirst({
                where: {
                  householdMeterId: meter.id,
                  billingPeriod: {
                    endDate: { lt: billingPeriod.startDate },
                  },
                },
                orderBy: { billingPeriod: { endDate: "desc" } },
              });

            const consumption = previousReading
              ? Number(reading.meterReading) -
                Number(previousReading.meterReading)
              : Number(reading.meterReading);

            const variableCost = consumption * Number(pricing.pricePerUnit);
            const fixedCost = Number(pricing.fixedFeePerHousehold);

            totalUtilityCosts += variableCost + fixedCost;

            utilityDetails.push({
              serviceId: meter.serviceId,
              serviceName: meter.service.name,
              consumption,
              variableCost,
              fixedCost,
              meterReading: Number(reading.meterReading),
              previousMeterReading: previousReading
                ? Number(previousReading.meterReading)
                : 0,
            });
          }
        }

        const bill = await prisma.monthlyBill.create({
          data: {
            householdId: household.id,
            billingPeriodId,
            totalUtilityCosts,
            totalAmount: totalUtilityCosts,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            status: "pending",
          },
          include: {
            household: true,
            billingPeriod: true,
          },
        });

        bills.push(bill);
      }

      return res.status(201).json({
        success: true,
        data: bills,
        message: `Generated ${bills.length} monthly bills`,
      });
    }
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/billing/reconciliation/:serviceId/:periodId - Get reconciliation data
router.get("/reconciliation/:serviceId/:periodId", async (req, res, next) => {
  try {
    const { serviceId, periodId } = req.params;

    // Get main meter readings
    const mainReadings = await prisma.mainMeterReading.findMany({
      where: {
        billingPeriodId: periodId,
        meter: { serviceId },
      },
      include: {
        meter: true,
      },
    });

    // Get household meter readings
    const householdReadings = await prisma.householdMeterReading.findMany({
      where: {
        billingPeriodId: periodId,
        householdMeter: { serviceId },
      },
      include: {
        householdMeter: {
          include: {
            household: true,
          },
        },
      },
    });

    // Calculate totals (simplified - would need previous readings for actual consumption)
    const totalMainConsumption = mainReadings.reduce((sum, reading) => {
      return sum + Number(reading.meterReading);
    }, 0);

    const totalHouseholdConsumption = householdReadings.reduce(
      (sum, reading) => {
        return sum + Number(reading.meterReading);
      },
      0
    );

    const reconciliationDifference =
      totalMainConsumption - totalHouseholdConsumption;
    const reconciliationPercentage =
      totalMainConsumption > 0
        ? (reconciliationDifference / totalMainConsumption) * 100
        : 0;

    res.json({
      success: true,
      data: {
        mainReadings,
        householdReadings,
        totals: {
          mainConsumption: totalMainConsumption,
          householdConsumption: totalHouseholdConsumption,
          difference: reconciliationDifference,
          percentage: reconciliationPercentage,
        },
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/billing/quarterly/:id - Get detailed quarterly bill with breakdown
router.get("/quarterly/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const bill = await prisma.quarterlyBill.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
            address: true,
          },
        },
        billingPeriod: {
          select: {
            id: true,
            periodName: true,
            startDate: true,
            endDate: true,
            readingDeadline: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            referenceNumber: true,
          },
        },
      },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: "Quarterly bill not found",
      });
    }

    // Get detailed utility billing breakdown
    const utilityBillings = await prisma.utilityBilling.findMany({
      where: {
        householdId: bill.householdId,
        billingPeriodId: bill.billingPeriodId,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            unit: true,
            serviceType: true,
          },
        },
        reconciliation: {
          select: {
            id: true,
            mainMeterTotal: true,
            householdTotal: true,
            difference: true,
            adjustmentPerHousehold: true,
          },
        },
      },
      orderBy: {
        service: { serviceType: "asc" },
      },
    });

    res.json({
      success: true,
      data: {
        ...bill,
        utilityBillings,
      },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/billing/quarterly/:id/pdf - Generate PDF for quarterly bill
router.get("/quarterly/:id/pdf", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate that the bill exists and user has access
    const bill = await prisma.quarterlyBill.findUnique({
      where: { id },
      include: {
        household: true,
        billingPeriod: true,
      },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Quarterly bill not found",
      });
    }

    // Role-based access control
    if (
      req.user?.role === "MEMBER" &&
      req.user?.householdId !== bill.householdId
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own bills.",
      });
    }

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateQuarterlyBillPDF(id);

    // Set response headers for PDF download
    const billNumber = `${new Date(bill.createdAt).getFullYear()}${(
      new Date(bill.createdAt).getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${bill.household.householdNumber
      .toString()
      .padStart(2, "0")}-${bill.id.substring(0, 8).toUpperCase()}`;
    const filename = `Faktura_${billNumber}_Hushall_${bill.household.householdNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
    return;
  } catch (error) {
    console.error("Error generating quarterly bill PDF:", error);
    next(error);
    return;
  }
});

// GET /api/billing/monthly/:id/pdf - Generate PDF for monthly bill
router.get("/monthly/:id/pdf", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate that the bill exists and user has access
    const bill = await prisma.monthlyBill.findUnique({
      where: { id },
      include: {
        household: true,
        billingPeriod: true,
      },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Monthly bill not found",
      });
    }

    // Role-based access control
    if (
      req.user?.role === "MEMBER" &&
      req.user?.householdId !== bill.householdId
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own bills.",
      });
    }

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateMonthlyBillPDF(id);

    // Set response headers for PDF download
    const billNumber = `${new Date(bill.createdAt).getFullYear()}${(
      new Date(bill.createdAt).getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${bill.household.householdNumber
      .toString()
      .padStart(2, "0")}-${bill.id.substring(0, 8).toUpperCase()}`;
    const filename = `Faktura_${billNumber}_Hushall_${bill.household.householdNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
    return;
  } catch (error) {
    console.error("Error generating monthly bill PDF:", error);
    next(error);
    return;
  }
});

// POST /api/billing/generate-pdfs - Bulk generate PDFs for multiple bills
router.post("/generate-pdfs", async (req, res, next) => {
  try {
    const schema = z.object({
      quarterlyBillIds: z.array(z.string().uuid()).optional(),
      monthlyBillIds: z.array(z.string().uuid()).optional(),
      billingPeriodId: z.string().uuid().optional(),
    });

    const { quarterlyBillIds, monthlyBillIds, billingPeriodId } = schema.parse(
      req.body
    );

    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required for bulk PDF generation.",
      });
    }

    const results = [];

    // Generate PDFs for quarterly bills
    if (quarterlyBillIds && quarterlyBillIds.length > 0) {
      for (const billId of quarterlyBillIds) {
        try {
          const pdfBuffer = await PDFGenerator.generateQuarterlyBillPDF(billId);
          results.push({
            billId,
            type: "quarterly",
            success: true,
            size: pdfBuffer.length,
          });
        } catch (error) {
          results.push({
            billId,
            type: "quarterly",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Generate PDFs for monthly bills
    if (monthlyBillIds && monthlyBillIds.length > 0) {
      for (const billId of monthlyBillIds) {
        try {
          const pdfBuffer = await PDFGenerator.generateMonthlyBillPDF(billId);
          results.push({
            billId,
            type: "monthly",
            success: true,
            size: pdfBuffer.length,
          });
        } catch (error) {
          results.push({
            billId,
            type: "monthly",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Generate PDFs for all bills in a billing period
    if (billingPeriodId) {
      const quarterlyBills = await prisma.quarterlyBill.findMany({
        where: { billingPeriodId },
        select: { id: true },
      });

      const monthlyBills = await prisma.monthlyBill.findMany({
        where: { billingPeriodId },
        select: { id: true },
      });

      // Process quarterly bills
      for (const bill of quarterlyBills) {
        try {
          const pdfBuffer = await PDFGenerator.generateQuarterlyBillPDF(
            bill.id
          );
          results.push({
            billId: bill.id,
            type: "quarterly",
            success: true,
            size: pdfBuffer.length,
          });
        } catch (error) {
          results.push({
            billId: bill.id,
            type: "quarterly",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Process monthly bills
      for (const bill of monthlyBills) {
        try {
          const pdfBuffer = await PDFGenerator.generateMonthlyBillPDF(bill.id);
          results.push({
            billId: bill.id,
            type: "monthly",
            success: true,
            size: pdfBuffer.length,
          });
        } catch (error) {
          results.push({
            billId: bill.id,
            type: "monthly",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: errorCount,
        },
      },
      message: `Generated ${successCount} PDFs successfully${
        errorCount > 0 ? `, ${errorCount} failed` : ""
      }`,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
