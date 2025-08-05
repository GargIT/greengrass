import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const router = Router();

// Validation schemas
const generateBillsSchema = z.object({
  billingPeriodId: z.string().uuid(),
  billType: z.enum(["quarterly", "monthly"]),
  force: z.boolean().optional().default(false), // Admin override to generate bills even if readings incomplete
});

// GET /api/billing/check-readiness/:billingPeriodId - Check if all households have submitted readings
router.get("/check-readiness/:billingPeriodId", async (req, res, next) => {
  try {
    const { billingPeriodId } = req.params;

    // Only admins can check billing readiness
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

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

    // Get all active households
    const activeHouseholds = await prisma.household.findMany({
      where: { isActive: true },
      include: {
        householdMeters: {
          include: {
            service: true,
            readings: {
              where: {
                billingPeriodId: billingPeriodId,
              },
            },
          },
        },
      },
      orderBy: { householdNumber: "asc" },
    });

    // Check which households are missing readings
    const readinessData = {
      billingPeriodId,
      periodName: billingPeriod.periodName,
      readingDeadline: billingPeriod.readingDeadline,
      totalHouseholds: activeHouseholds.length,
      householdsReady: 0,
      householdsMissingReadings: 0,
      allReadingsComplete: false,
      missingReadings: [] as any[],
      householdStatus: [] as any[],
    };

    for (const household of activeHouseholds) {
      const householdStatus = {
        householdId: household.id,
        householdNumber: household.householdNumber,
        ownerName: household.ownerName,
        hasAllReadings: true,
        missingServices: [] as string[],
        submittedReadings: 0,
        totalMeters: household.householdMeters.length,
      };

      // Check each meter for this household
      for (const meter of household.householdMeters) {
        const hasReading = meter.readings.length > 0;
        householdStatus.submittedReadings += hasReading ? 1 : 0;

        if (!hasReading) {
          householdStatus.hasAllReadings = false;
          householdStatus.missingServices.push(meter.service.name);
        }
      }

      if (householdStatus.hasAllReadings) {
        readinessData.householdsReady++;
      } else {
        readinessData.householdsMissingReadings++;
        readinessData.missingReadings.push({
          householdNumber: household.householdNumber,
          ownerName: household.ownerName,
          missingServices: householdStatus.missingServices,
        });
      }

      readinessData.householdStatus.push(householdStatus);
    }

    // All readings complete if all households have submitted all their readings
    readinessData.allReadingsComplete =
      readinessData.householdsMissingReadings === 0;

    res.json({
      success: true,
      data: readinessData,
    });
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
