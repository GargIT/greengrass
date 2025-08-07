import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const router = Router();

// GET /api/billing/check-readiness/:periodId - Check if all households have submitted readings
router.get("/check-readiness/:periodId", async (req, res, next) => {
  try {
    const { periodId } = req.params;

    // Only admins can check billing readiness
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    // Get billing period
    const billingPeriod = await prisma.billingPeriod.findUnique({
      where: { id: periodId },
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
                billingPeriodId: periodId,
              },
            },
          },
        },
      },
      orderBy: { householdNumber: "asc" },
    });

    // Check which households are missing readings
    const readinessData = {
      billingPeriodId: periodId,
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
      // Filter out MEMBERSHIP service as it doesn't require meter readings
      const metersRequiringReadings = household.householdMeters.filter(
        (meter) => meter.service.serviceType !== "MEMBERSHIP"
      );

      const householdStatus = {
        householdId: household.id,
        householdNumber: household.householdNumber,
        ownerName: household.ownerName,
        hasAllReadings: true,
        missingServices: [] as string[],
        submittedReadings: 0,
        totalMeters: metersRequiringReadings.length,
      };

      // Check each meter for this household (excluding MEMBERSHIP)
      for (const meter of metersRequiringReadings) {
        const hasReading = meter.readings.length > 0;
        householdStatus.submittedReadings += hasReading ? 1 : 0;

        if (!hasReading) {
          householdStatus.hasAllReadings = false;
          householdStatus.missingServices.push(meter.service.name);
        }
      }

      // Only consider household ready if it has meters requiring readings
      householdStatus.hasAllReadings =
        householdStatus.hasAllReadings && metersRequiringReadings.length > 0;

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
    return next(error);
  }
});

export default router;
