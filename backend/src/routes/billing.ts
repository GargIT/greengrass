import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { PDFGenerator } from "../lib/pdfGenerator";

const router = Router();

// Helper function to generate reconciliation records for a billing period
async function generateReconciliationRecords(billingPeriodId: string) {
  // Get billing period info
  const billingPeriod = await prisma.billingPeriod.findUnique({
    where: { id: billingPeriodId },
  });

  if (!billingPeriod) {
    throw new Error("Billing period not found");
  }

  // Get all services that require reconciliation (typically water services)
  const servicesRequiringReconciliation = await prisma.utilityService.findMany({
    where: {
      requiresReadings: true,
      // Only create reconciliation for services that have both main meters and household meters
      AND: [{ mainMeters: { some: {} } }, { householdMeters: { some: {} } }],
    },
    include: {
      mainMeters: {
        include: {
          readings: {
            where: { billingPeriodId },
            include: {
              billingPeriod: true,
            },
          },
        },
      },
      householdMeters: {
        include: {
          readings: {
            where: { billingPeriodId },
            include: {
              billingPeriod: true,
            },
          },
        },
      },
    },
  });

  for (const service of servicesRequiringReconciliation) {
    // Check if reconciliation already exists for this service and period
    const existingReconciliation = await prisma.utilityReconciliation.findFirst(
      {
        where: {
          serviceId: service.id,
          billingPeriodId,
        },
      }
    );

    if (existingReconciliation) {
      console.log(
        `Reconciliation already exists for ${service.name} in this period`
      );
      continue;
    }

    // Calculate main meter consumption
    let totalMainConsumption = 0;
    for (const mainMeter of service.mainMeters) {
      for (const reading of mainMeter.readings) {
        // Get previous reading to calculate consumption
        const previousReading = await prisma.mainMeterReading.findFirst({
          where: {
            meterId: mainMeter.id,
            billingPeriod: {
              endDate: { lt: billingPeriod.startDate },
            },
          },
          orderBy: { billingPeriod: { endDate: "desc" } },
        });

        const consumption = previousReading
          ? Number(reading.meterReading) - Number(previousReading.meterReading)
          : Number(reading.meterReading);

        totalMainConsumption += consumption;
      }
    }

    // Calculate total household consumption
    let totalHouseholdConsumption = 0;
    for (const householdMeter of service.householdMeters) {
      for (const reading of householdMeter.readings) {
        // Get previous reading to calculate consumption
        const previousReading = await prisma.householdMeterReading.findFirst({
          where: {
            householdMeterId: householdMeter.id,
            billingPeriod: {
              endDate: { lt: billingPeriod.startDate },
            },
          },
          orderBy: { billingPeriod: { endDate: "desc" } },
        });

        const consumption = previousReading
          ? Number(reading.meterReading) - Number(previousReading.meterReading)
          : Number(reading.meterReading);

        totalHouseholdConsumption += consumption;
      }
    }

    // Calculate reconciliation difference
    const difference = totalMainConsumption - totalHouseholdConsumption;

    // Only create reconciliation if there's a meaningful difference (e.g., more than 1% or absolute value > 10)
    const significantDifference =
      Math.abs(difference) > 10 ||
      (totalMainConsumption > 0 &&
        Math.abs(difference / totalMainConsumption) > 0.01);

    if (!significantDifference) {
      console.log(
        `No significant reconciliation needed for ${service.name}: difference = ${difference}`
      );
      continue;
    }

    // Calculate cost per unit from service pricing
    const pricing = await prisma.utilityPricing.findFirst({
      where: {
        serviceId: service.id,
        isActive: true,
        effectiveDate: { lte: billingPeriod.endDate },
      },
      orderBy: { effectiveDate: "desc" },
    });

    if (!pricing) {
      console.log(
        `No pricing found for service ${service.name}, skipping reconciliation`
      );
      continue;
    }

    // Get number of active households for this period
    const activeHouseholds = await prisma.household.count({
      where: { isActive: true },
    });

    // Calculate adjustment per household (in volume, not cost)
    const volumeAdjustmentPerHousehold =
      activeHouseholds > 0 ? difference / activeHouseholds : 0;

    // Create reconciliation record - store volume adjustment (m³), not cost
    await prisma.utilityReconciliation.create({
      data: {
        serviceId: service.id,
        billingPeriodId,
        mainMeterTotal: totalMainConsumption,
        householdTotal: totalHouseholdConsumption,
        difference,
        adjustmentPerHousehold: volumeAdjustmentPerHousehold, // Store volume adjustment (m³)
        reconciliationDate: billingPeriod.endDate,
      },
    });

    console.log(
      `Created reconciliation for ${service.name}: ${difference} ${service.unit} difference, ${volumeAdjustmentPerHousehold} ${service.unit} per household`
    );
  }
}

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
  billType: z.enum(["quarterly"]),
});

// GET /api/billing/periods - Get all billing periods
router.get("/periods", async (req, res, next) => {
  try {
    const { forMeterReadings } = req.query;

    let whereClause = {};

    // If forMeterReadings=true, only show past periods and current period (not future periods)
    if (forMeterReadings === "true") {
      const now = new Date();

      whereClause = {
        OR: [
          // Past periods (end date is before today)
          { endDate: { lt: now } },
          // Current period (we are in the middle of it)
          {
            AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }],
          },
        ],
      };
    }

    const periods = await prisma.billingPeriod.findMany({
      where: whereClause,
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: {
            quarterlyBills: true,
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
            service: true,
            readings: {
              where: { billingPeriodId },
            },
          },
        },
      },
    });

    // STEP 1: Calculate and create reconciliation records for services that require it
    await generateReconciliationRecords(billingPeriodId);

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
      console.log(
        `Processing household ${household.householdNumber}, meters: ${household.householdMeters.length}`
      );

      for (const meter of household.householdMeters) {
        console.log(
          `Processing meter for service: ${meter.service.name}, requiresReadings: ${meter.service.requiresReadings}`
        );

        // Fetch pricing separately for this service
        // Use a more lenient date check - look for active pricing around the billing period
        const pricing = await prisma.utilityPricing.findFirst({
          where: {
            serviceId: meter.serviceId,
            isActive: true,
            // Allow pricing that becomes effective up to a few days after the billing period
            effectiveDate: {
              lte: new Date(
                billingPeriod.endDate.getTime() + 2 * 24 * 60 * 60 * 1000
              ),
            },
          },
          orderBy: { effectiveDate: "desc" },
        });

        if (!pricing) {
          console.log(
            `No pricing found for service ${meter.service.name} (${meter.service.serviceType})`
          );
          continue;
        }

        console.log(
          `Pricing found: ${pricing.pricePerUnit}/unit, ${pricing.fixedFeePerHousehold} fixed`
        );

        const reading = meter.readings[0];
        console.log(
          `Readings for this meter: ${meter.readings.length}`,
          reading ? `Reading: ${reading.meterReading}` : "No reading"
        );

        // For services that require readings, we need a reading to bill
        if (meter.service.requiresReadings && reading) {
          console.log(
            `Processing service with readings: ${meter.service.name}`
          );

          // Get previous reading for consumption calculation
          const previousReading = await prisma.householdMeterReading.findFirst({
            where: {
              householdMeterId: meter.id,
              billingPeriod: {
                endDate: { lt: billingPeriod.startDate },
              },
            },
            orderBy: { billingPeriod: { endDate: "desc" } },
          });

          console.log(
            `Previous reading: ${
              previousReading ? previousReading.meterReading : "none"
            }`
          );

          const consumption = previousReading
            ? Number(reading.meterReading) -
              Number(previousReading.meterReading)
            : Number(reading.meterReading);

          console.log(`Consumption calculated: ${consumption}`);

          const variableCost = consumption * Number(pricing.pricePerUnit);
          const fixedCost = Number(pricing.fixedFeePerHousehold);

          console.log(
            `Variable cost: ${variableCost}, Fixed cost: ${fixedCost}`
          );

          // Check for existing reconciliation adjustment for this service and period
          const reconciliation = await prisma.utilityReconciliation.findFirst({
            where: {
              serviceId: meter.serviceId,
              billingPeriodId,
            },
          });

          // Calculate reconciliation cost from volume stored in database
          const reconciliationVolume = reconciliation
            ? Number(reconciliation.adjustmentPerHousehold)
            : 0;
          const reconciliationCost =
            reconciliationVolume * Number(pricing.pricePerUnit);

          // Calculate total cost components
          const totalServiceCost =
            variableCost + fixedCost + reconciliationCost;
          totalUtilityCosts += totalServiceCost;

          console.log(
            `Total service cost: ${totalServiceCost}, Running total utility costs: ${totalUtilityCosts}`
          );

          // Create separate UtilityBilling records for better invoice clarity

          // 1. Variable cost (consumption) record - always create if there's consumption (including 0 or negative)
          if (consumption !== 0) {
            await prisma.utilityBilling.create({
              data: {
                householdId: household.id,
                serviceId: meter.serviceId,
                billingPeriodId,
                consumption: consumption,
                costPerUnit: Number(pricing.pricePerUnit),
                consumptionCost: variableCost,
                fixedCost: 0, // No fixed fee on this line
                totalUtilityCost: variableCost,
              },
            });
          }

          // 2. Reconciliation adjustment record (if any)
          if (reconciliationCost !== 0 && reconciliation) {
            await prisma.utilityBilling.create({
              data: {
                householdId: household.id,
                serviceId: meter.serviceId,
                billingPeriodId,
                consumption: reconciliationVolume,
                costPerUnit: Number(pricing.pricePerUnit),
                consumptionCost: reconciliationCost,
                fixedCost: 0, // No fixed fee on this line
                totalUtilityCost: reconciliationCost,
                reconciliationId: reconciliation.id,
              },
            });
          }

          // 3. Fixed fee record - only if there's a fixed fee
          if (fixedCost !== 0) {
            await prisma.utilityBilling.create({
              data: {
                householdId: household.id,
                serviceId: meter.serviceId,
                billingPeriodId,
                consumption: 0, // No consumption for fixed fee
                costPerUnit: 0, // Fixed fee, no per-unit cost
                consumptionCost: 0, // No consumption cost
                fixedCost: fixedCost,
                totalUtilityCost: fixedCost,
              },
            });
          }

          utilityDetails.push({
            serviceId: meter.serviceId,
            serviceName: meter.service.name,
            consumption,
            variableCost,
            fixedCost,
            reconciliationAdjustment: reconciliationCost,
            totalCost: totalServiceCost,
            meterReading: Number(reading.meterReading),
            previousMeterReading: previousReading
              ? Number(previousReading.meterReading)
              : 0,
          });
        }
        // Handle services that don't require readings (like INTERNET, etc.)
        // BUT exclude MEMBERSHIP from utility costs - it's handled separately
        else if (
          !meter.service.requiresReadings &&
          meter.service.serviceType !== "MEMBERSHIP"
        ) {
          console.log(
            `Processing service without readings: ${meter.service.name}`
          );

          const fixedCost = Number(pricing.fixedFeePerHousehold);
          console.log(`Fixed cost for ${meter.service.name}: ${fixedCost}`);

          if (fixedCost > 0) {
            totalUtilityCosts += fixedCost;
            console.log(`Added fixed cost, new total: ${totalUtilityCosts}`);

            // Create UtilityBilling record for fixed cost service
            await prisma.utilityBilling.create({
              data: {
                householdId: household.id,
                serviceId: meter.serviceId,
                billingPeriodId,
                consumption: 0, // No consumption for fixed services
                costPerUnit: 0, // Fixed service, no per-unit cost
                consumptionCost: 0, // No consumption cost
                fixedCost: fixedCost,
                totalUtilityCost: fixedCost,
              },
            });

            utilityDetails.push({
              serviceId: meter.serviceId,
              serviceName: meter.service.name,
              consumption: 0,
              variableCost: 0,
              fixedCost,
              reconciliationAdjustment: 0,
              totalCost: fixedCost,
              meterReading: 0,
              previousMeterReading: 0,
            });
          }
        }
        // Skip MEMBERSHIP service here - it's handled separately as memberFee
        else if (meter.service.serviceType === "MEMBERSHIP") {
          console.log(
            `Skipping MEMBERSHIP service - handled separately as member fee`
          );
        } else {
          console.log(
            `Skipping service ${meter.service.name}: requiresReadings=${
              meter.service.requiresReadings
            }, hasReading=${!!reading}`
          );
        }
      }

      // Calculate shared costs
      const totalSharedCosts = sharedCosts.reduce(
        (sum, cost) => sum + Number(cost.costPerHousehold),
        0
      );

      // Calculate member fee from existing utility billings (MEMBERSHIP service)
      let memberFeeFromUtility = await prisma.utilityBilling.findFirst({
        where: {
          householdId: household.id,
          billingPeriodId,
          service: { serviceType: "MEMBERSHIP" },
        },
      });

      let memberFee = 0;

      if (memberFeeFromUtility) {
        memberFee = Number(memberFeeFromUtility.totalUtilityCost);
      } else {
        // Get member fee from MEMBERSHIP service pricing and create UtilityBilling record
        const membershipService = await prisma.utilityService.findFirst({
          where: { serviceType: "MEMBERSHIP" },
        });

        if (membershipService) {
          // Use the same lenient pricing query as for other services
          const membershipPricing = await prisma.utilityPricing.findFirst({
            where: {
              serviceId: membershipService.id,
              isActive: true,
              // Allow pricing that becomes effective up to a few days after the billing period
              effectiveDate: {
                lte: new Date(
                  billingPeriod.endDate.getTime() + 2 * 24 * 60 * 60 * 1000
                ),
              },
            },
            orderBy: { effectiveDate: "desc" },
          });

          if (membershipPricing) {
            memberFee = Number(membershipPricing.fixedFeePerHousehold);

            // Create UtilityBilling record for membership fee
            await prisma.utilityBilling.create({
              data: {
                householdId: household.id,
                serviceId: membershipService.id,
                billingPeriodId,
                consumption: 0,
                costPerUnit: 0,
                consumptionCost: 0,
                fixedCost: memberFee,
                totalUtilityCost: memberFee,
              },
            });
          } else {
            // Fallback to default membership fee
            memberFee = 1000;
          }
        } else {
          // Fallback to default membership fee
          memberFee = 1000;
        }
      }
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
  } catch (error) {
    next(error);
    return;
  }
});

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
      select: {
        id: true,
        consumption: true, // consumption amount (volume/quantity)
        costPerUnit: true, // price per unit
        consumptionCost: true, // variable cost (consumption * costPerUnit)
        fixedCost: true, // fixed fee cost
        totalUtilityCost: true, // total cost for this line
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

// POST /api/billing/generate-pdfs - Bulk generate PDFs for multiple bills
router.post("/generate-pdfs", async (req, res, next) => {
  try {
    const schema = z.object({
      quarterlyBillIds: z.array(z.string().uuid()).optional(),
      billingPeriodId: z.string().uuid().optional(),
    });

    const { quarterlyBillIds, billingPeriodId } = schema.parse(req.body);

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

    // Generate PDFs for all bills in a billing period
    if (billingPeriodId) {
      const quarterlyBills = await prisma.quarterlyBill.findMany({
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

// GET /api/billing/periods/:id/reporting-status - Get reporting status for a billing period
router.get("/periods/:id/reporting-status", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get the billing period
    const billingPeriod = await prisma.billingPeriod.findUnique({
      where: { id },
    });

    if (!billingPeriod) {
      return res.status(404).json({
        success: false,
        message: "Billing period not found",
      });
    }

    // Get all active households with their meters
    const households = await prisma.household.findMany({
      where: { isActive: true },
      include: {
        householdMeters: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                serviceType: true,
                requiresReadings: true,
              },
            },
            readings: {
              where: { billingPeriodId: id },
              select: {
                id: true,
                meterReading: true,
                readingDate: true,
              },
            },
          },
        },
      },
      orderBy: { householdNumber: "asc" },
    });

    // Calculate reporting status for each household
    const reportingStatus = households.map((household) => {
      const meters = household.householdMeters;
      // Filter to only services that require meter readings
      const metersRequiringReadings = meters.filter(
        (meter) => meter.service.requiresReadings
      );
      const totalMeters = metersRequiringReadings.length;
      const reportedMeters = metersRequiringReadings.filter(
        (meter) => meter.readings.length > 0
      ).length;
      const missingServices = metersRequiringReadings
        .filter((meter) => meter.readings.length === 0)
        .map((meter) => ({
          serviceId: meter.service.id,
          serviceName: meter.service.name,
          serviceType: meter.service.serviceType,
        }));

      const reportedServices = metersRequiringReadings
        .filter((meter) => meter.readings.length > 0)
        .map((meter) => ({
          serviceId: meter.service.id,
          serviceName: meter.service.name,
          reading: meter.readings[0].meterReading,
          readingDate: meter.readings[0].readingDate,
        }));

      return {
        householdId: household.id,
        householdNumber: household.householdNumber,
        ownerName: household.ownerName,
        totalMeters,
        reportedMeters,
        isComplete: reportedMeters === totalMeters && totalMeters > 0,
        completionPercentage:
          totalMeters > 0
            ? Math.round((reportedMeters / totalMeters) * 100)
            : 0,
        missingServices,
        reportedServices,
      };
    });

    // Calculate overall statistics
    const totalHouseholds = households.length;
    const completeHouseholds = reportingStatus.filter(
      (h) => h.isComplete
    ).length;
    const incompleteHouseholds = totalHouseholds - completeHouseholds;
    const overallCompletionPercentage =
      totalHouseholds > 0
        ? Math.round((completeHouseholds / totalHouseholds) * 100)
        : 0;

    // Get services that require meter readings
    const allServices = await prisma.utilityService.findMany({
      where: {
        requiresReadings: true,
        householdMeters: {
          some: {
            household: { isActive: true },
          },
        },
      },
      select: {
        id: true,
        name: true,
        serviceType: true,
      },
    });

    res.json({
      success: true,
      data: {
        billingPeriod: {
          id: billingPeriod.id,
          periodName: billingPeriod.periodName,
          startDate: billingPeriod.startDate,
          endDate: billingPeriod.endDate,
          readingDeadline: billingPeriod.readingDeadline,
        },
        statistics: {
          totalHouseholds,
          completeHouseholds,
          incompleteHouseholds,
          overallCompletionPercentage,
        },
        households: reportingStatus,
        availableServices: allServices,
      },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/billing/check-readiness/:periodId - Check billing readiness (compatibility endpoint)
router.get("/check-readiness/:periodId", async (req, res, next) => {
  try {
    const { periodId } = req.params;

    // Get the billing period
    const billingPeriod = await prisma.billingPeriod.findUnique({
      where: { id: periodId },
    });

    if (!billingPeriod) {
      return res.status(404).json({
        success: false,
        message: "Billing period not found",
      });
    }

    // Get all active households with their meters
    const households = await prisma.household.findMany({
      where: { isActive: true },
      include: {
        householdMeters: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                serviceType: true,
              },
            },
            readings: {
              where: { billingPeriodId: periodId },
              select: {
                id: true,
                meterReading: true,
                readingDate: true,
              },
            },
          },
        },
      },
      orderBy: { householdNumber: "asc" },
    });

    // Calculate readiness status
    const householdStatus = households.map((household) => {
      const meters = household.householdMeters;
      // Filter out MEMBERSHIP service as it doesn't require meter readings
      const metersRequiringReadings = meters.filter(
        (meter) => meter.service.serviceType !== "MEMBERSHIP"
      );
      const totalMeters = metersRequiringReadings.length;
      const reportedMeters = metersRequiringReadings.filter(
        (meter) => meter.readings.length > 0
      ).length;
      const missingServices = metersRequiringReadings
        .filter((meter) => meter.readings.length === 0)
        .map((meter) => meter.service.name);

      return {
        householdId: household.id,
        householdNumber: household.householdNumber,
        ownerName: household.ownerName,
        hasAllReadings: reportedMeters === totalMeters && totalMeters > 0,
        missingServices,
        submittedReadings: reportedMeters,
        totalMeters,
      };
    });

    // Calculate overall statistics
    const totalHouseholds = households.length;
    const householdsReady = householdStatus.filter(
      (h) => h.hasAllReadings
    ).length;
    const householdsMissingReadings = totalHouseholds - householdsReady;
    const allReadingsComplete = householdsReady === totalHouseholds;

    // Get households missing readings
    const missingReadings = householdStatus
      .filter((h) => !h.hasAllReadings)
      .map((h) => ({
        householdNumber: h.householdNumber,
        ownerName: h.ownerName,
        missingServices: h.missingServices,
      }));

    const readinessData = {
      billingPeriodId: billingPeriod.id,
      periodName: billingPeriod.periodName,
      readingDeadline: billingPeriod.readingDeadline.toISOString(),
      totalHouseholds,
      householdsReady,
      householdsMissingReadings,
      allReadingsComplete,
      missingReadings,
      householdStatus,
    };

    res.json({
      success: true,
      data: readinessData,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// DELETE /api/billing/delete-period-bills - Delete all bills and related data for a billing period
router.delete("/delete-period-bills", async (req, res, next) => {
  try {
    const { billingPeriodId } = req.body;

    if (!billingPeriodId) {
      return res.status(400).json({
        success: false,
        message: "Billing period ID is required",
      });
    }

    // Admin only
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete utility billings first (foreign key constraint)
      const deletedUtilityBillings = await tx.utilityBilling.deleteMany({
        where: { billingPeriodId },
      });

      // Delete quarterly bills
      const deletedQuarterlyBills = await tx.quarterlyBill.deleteMany({
        where: { billingPeriodId },
      });

      return {
        utilityBillings: deletedUtilityBillings.count,
        quarterlyBills: deletedQuarterlyBills.count,
      };
    });

    res.json({
      success: true,
      data: result,
      message: `Deleted ${result.quarterlyBills} quarterly bills and ${result.utilityBillings} utility billing records`,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// DEBUG: Check reconciliation for 2025-04-30 and household 20
router.get("/debug/reconciliation-2025", async (req, res, next) => {
  try {
    // Find 2025-04-30 period
    const period = await prisma.billingPeriod.findFirst({
      where: { periodName: "2025-04-30" },
    });

    if (!period) {
      return res.json({
        success: false,
        message: "2025-04-30 period not found",
      });
    }

    // Find household 20
    const household = await prisma.household.findFirst({
      where: { householdNumber: 20 },
    });

    if (!household) {
      return res.json({ success: false, message: "Household 20 not found" });
    }

    // Check reconciliation data
    const reconciliations = await prisma.utilityReconciliation.findMany({
      where: { billingPeriodId: period.id },
      include: { service: true },
    });

    // Check existing bills
    const bills = await prisma.quarterlyBill.findMany({
      where: {
        billingPeriodId: period.id,
        householdId: household.id,
      },
    });

    // Check utility billing details
    const utilityBillings = await prisma.utilityBilling.findMany({
      where: {
        householdId: household.id,
        billingPeriodId: period.id,
      },
      include: {
        service: true,
        reconciliation: true,
      },
    });

    res.json({
      success: true,
      data: {
        period: period.periodName,
        household: `${household.householdNumber} - ${household.ownerName}`,
        reconciliations: reconciliations.map((r) => ({
          service: r.service.name,
          adjustmentPerHousehold: r.adjustmentPerHousehold,
        })),
        existingBills: bills.length,
        billTotals: bills.map((b) => ({
          total: b.totalAmount,
          utilities: b.totalUtilityCosts,
          memberFee: b.memberFee,
        })),
        utilityBillings: utilityBillings.map((ub) => ({
          service: ub.service.name,
          consumptionCost: ub.consumptionCost,
          fixedFee: ub.fixedCost,
          total: ub.totalUtilityCost,
        })),
      },
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Mark quarterly bill as paid
router.patch("/quarterly/:billId/mark-paid", async (req, res, next) => {
  try {
    const { billId } = req.params;
    const { paymentDate, paymentMethod, notes } = req.body;

    // Validate input
    const schema = z.object({
      paymentDate: z.string().optional(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
    });

    const validatedData = schema.parse(req.body);

    // Check if bill exists
    const existingBill = await prisma.quarterlyBill.findUnique({
      where: { id: billId },
      include: { household: true },
    });

    if (!existingBill) {
      res.status(404).json({
        success: false,
        message: "Quarterly bill not found",
      });
      return;
    }

    // Update bill status to paid
    const updatedBill = await prisma.quarterlyBill.update({
      where: { id: billId },
      data: {
        status: "paid",
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        quarterlyBillId: billId,
        amount: Number(existingBill.totalAmount),
        paymentDate: validatedData.paymentDate
          ? new Date(validatedData.paymentDate)
          : new Date(),
        paymentMethod: validatedData.paymentMethod || "unknown",
        notes: validatedData.notes,
      },
    });

    res.json({
      success: true,
      data: updatedBill,
      message: `Faktura för ${existingBill.household.ownerName} markerad som betald`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
