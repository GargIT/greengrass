import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/reports/dashboard - Get dashboard overview data
router.get("/dashboard", async (req, res, next) => {
  try {
    // Get current year and quarter
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 4);

    // Get total households
    const totalHouseholds = await prisma.household.count({
      where: { isActive: true },
    });

    // Get pending bills count
    const pendingInvoices = await prisma.invoice.count({
      where: { status: "pending" },
    });

    // Get total revenue for current year - filter by period name
    const invoiceRevenue = await prisma.invoice.aggregate({
      where: {
        billingPeriod: {
          periodName: {
            contains: currentYear.toString(),
          },
        },
        status: "paid",
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Get active utility services
    const activeServices = await prisma.utilityService.count({
      where: { isActive: true },
    });

    // Get recent meter readings
    const recentReadings = await prisma.householdMeterReading.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        householdMeter: {
          include: {
            household: {
              select: {
                householdNumber: true,
                ownerName: true,
              },
            },
            service: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
        billingPeriod: {
          select: {
            periodName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalHouseholds,
          activeServices,
          pendingBills: pendingInvoices,
          totalRevenue: Number(invoiceRevenue._sum.totalAmount || 0),
        },
        recentReadings,
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/consumption/:serviceId - Get consumption report for a service
router.get("/consumption/:serviceId", async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { year, period } = req.query;

    const currentYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    // Get service details
    const service = await prisma.utilityService.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Get consumption data by household
    const readings = await prisma.householdMeterReading.findMany({
      where: {
        householdMeter: { serviceId },
        billingPeriod: {
          startDate: {
            gte: new Date(currentYear, 0, 1),
            lt: new Date(currentYear + 1, 0, 1),
          },
          ...(period && { periodName: { contains: period as string } }),
        },
      },
      include: {
        householdMeter: {
          include: {
            household: {
              select: {
                id: true,
                householdNumber: true,
                ownerName: true,
              },
            },
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
      },
      orderBy: [
        { billingPeriod: { startDate: "asc" } },
        { householdMeter: { household: { householdNumber: "asc" } } },
      ],
    });

    // Group by household and calculate consumption
    const householdConsumption = readings.reduce((acc, reading) => {
      const householdId = reading.householdMeter.household.id;

      if (!acc[householdId]) {
        acc[householdId] = {
          household: reading.householdMeter.household,
          periods: [],
          totalConsumption: 0,
        };
      }

      // Calculate consumption (simplified - would need previous reading)
      const consumption = Number(reading.meterReading);
      acc[householdId].periods.push({
        period: reading.billingPeriod,
        reading: Number(reading.meterReading),
        consumption,
      });
      acc[householdId].totalConsumption += consumption;

      return acc;
    }, {} as any);

    return res.json({
      success: true,
      data: {
        service,
        year: currentYear,
        households: Object.values(householdConsumption),
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/billing/:periodId - Get billing report for a period
router.get("/billing/:periodId", async (req, res, next) => {
  try {
    const { periodId } = req.params;
    const { type = "tertiary" } = req.query;

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

    const bills = await prisma.invoice.findMany({
      where: { billingPeriodId: periodId },
      include: {
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
            email: true,
            // andelstal field removed - using equal shares (1/14) for all
          },
        },
        payments: true,
      },
      orderBy: { household: { householdNumber: "asc" } },
    });

    const summary = {
      totalBills: bills.length,
      totalAmount: bills.reduce(
        (sum, bill) => sum + Number(bill.totalAmount),
        0
      ),
      totalUtilityCosts: bills.reduce(
        (sum, bill) => sum + Number(bill.totalUtilityCosts),
        0
      ),
      totalMemberFees: bills.reduce(
        (sum, bill) => sum + Number(bill.memberFee),
        0
      ),
      totalSharedCosts: bills.reduce(
        (sum, bill) => sum + Number(bill.sharedCosts),
        0
      ),
      paidBills: bills.filter((bill) => bill.status === "paid").length,
      pendingBills: bills.filter((bill) => bill.status === "pending").length,
      overdueBills: bills.filter((bill) => bill.status === "overdue").length,
    };

    return res.json({
      success: true,
      data: {
        billingPeriod,
        bills,
        summary,
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/payments - Get payments report
router.get("/payments", async (req, res, next) => {
  try {
    const { year, month, householdId } = req.query;
    const currentYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    let startDate = new Date(currentYear, 0, 1);
    let endDate = new Date(currentYear + 1, 0, 1);

    if (month) {
      const monthNum = parseInt(month as string) - 1;
      startDate = new Date(currentYear, monthNum, 1);
      endDate = new Date(currentYear, monthNum + 1, 1);
    }

    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lt: endDate,
        },
        ...(householdId && {
          OR: [{ invoice: { householdId: householdId as string } }],
        }),
      },
      include: {
        invoice: {
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
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      ),
      invoicePayments: payments.filter((p) => p.invoiceId).length,
    };

    res.json({
      success: true,
      data: {
        payments,
        summary,
        period: {
          year: currentYear,
          month: month ? parseInt(month as string) : null,
        },
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/export/:type - Export data as CSV
router.get("/export/:type", async (req, res, next) => {
  try {
    const { type } = req.params;
    const { periodId, serviceId, year } = req.query;

    // This is a placeholder for CSV export functionality
    // In a real implementation, you would generate CSV data and return it

    res.json({
      success: true,
      message: `Export functionality for ${type} would be implemented here`,
      data: {
        type,
        filters: { periodId, serviceId, year },
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/analytics/consumption-trends - Get consumption trends over time
router.get("/analytics/consumption-trends", async (req, res, next) => {
  try {
    const { serviceId, year, householdId } = req.query;
    const currentYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    // Get all billing periods for the year - filter by period name
    const billingPeriods = await prisma.billingPeriod.findMany({
      where: {
        periodName: {
          contains: currentYear.toString(),
        },
      },
      orderBy: { startDate: "asc" },
    });

    const trendsData = [];

    for (const period of billingPeriods) {
      // Get readings for this period
      const readings = await prisma.householdMeterReading.findMany({
        where: {
          billingPeriodId: period.id,
          ...(serviceId && {
            householdMeter: { serviceId: serviceId as string },
          }),
          ...(householdId && {
            householdMeter: { householdId: householdId as string },
          }),
        },
        include: {
          householdMeter: {
            include: {
              service: {
                select: { name: true, unit: true, serviceType: true },
              },
              household: { select: { householdNumber: true, ownerName: true } },
            },
          },
        },
      });

      // Calculate average consumption and total for this period
      if (readings.length > 0) {
        const totalConsumption = readings.reduce(
          (sum, reading) => sum + Number(reading.meterReading),
          0
        );
        const avgConsumption = totalConsumption / readings.length;

        trendsData.push({
          period: period.periodName,
          date: period.startDate,
          totalConsumption,
          avgConsumption,
          readingsCount: readings.length,
          details: readings.map((r) => ({
            household: r.householdMeter.household.householdNumber,
            service: r.householdMeter.service.name,
            consumption: Number(r.meterReading),
            unit: r.householdMeter.service.unit,
          })),
        });
      }
    }

    res.json({
      success: true,
      data: {
        trends: trendsData,
        year: currentYear,
        filters: { serviceId, householdId },
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/analytics/cost-analysis - Get cost analysis and breakdown
router.get("/analytics/cost-analysis", async (req, res, next) => {
  try {
    const { year, householdId } = req.query;
    const currentYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    // Get all invoices for the year - filter by period name containing the year
    const invoices = await prisma.invoice.findMany({
      where: {
        billingPeriod: {
          periodName: {
            contains: currentYear.toString(),
          },
        },
        ...(householdId && { householdId: householdId as string }),
      },
      include: {
        household: {
          select: { householdNumber: true, ownerName: true },
        },
        billingPeriod: {
          select: { periodName: true, startDate: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get utility billing breakdown - filter by period name
    const utilityBillings = await prisma.utilityBilling.findMany({
      where: {
        billingPeriod: {
          periodName: {
            contains: currentYear.toString(),
          },
        },
        ...(householdId && { householdId: householdId as string }),
      },
      include: {
        service: {
          select: { name: true, serviceType: true, unit: true },
        },
        household: {
          select: { householdNumber: true, ownerName: true },
        },
        billingPeriod: {
          select: { periodName: true, startDate: true },
        },
      },
      orderBy: { billingPeriod: { startDate: "asc" } },
    });

    // Aggregate cost data by period
    const costByPeriod = invoices.reduce((acc, invoice) => {
      const periodName = invoice.billingPeriod.periodName;
      if (!acc[periodName]) {
        acc[periodName] = {
          period: periodName,
          date: invoice.billingPeriod.startDate,
          totalAmount: 0,
          memberFees: 0,
          utilityCosts: 0,
          sharedCosts: 0,
          invoiceCount: 0,
        };
      }

      acc[periodName].totalAmount += Number(invoice.totalAmount);
      acc[periodName].memberFees += Number(invoice.memberFee);
      acc[periodName].utilityCosts += Number(invoice.totalUtilityCosts);
      acc[periodName].sharedCosts += Number(invoice.sharedCosts);
      acc[periodName].invoiceCount += 1;

      return acc;
    }, {} as any);

    // Aggregate cost data by service type
    const costByService = utilityBillings.reduce((acc, ub) => {
      const serviceType = ub.service.serviceType;
      if (!acc[serviceType]) {
        acc[serviceType] = {
          serviceType,
          totalCost: 0,
          avgCostPerUnit: 0,
          totalConsumption: 0,
          recordCount: 0,
        };
      }

      acc[serviceType].totalCost += Number(ub.totalUtilityCost);
      acc[serviceType].totalConsumption += Number(ub.consumption);
      acc[serviceType].recordCount += 1;

      return acc;
    }, {} as any);

    // Calculate averages
    Object.values(costByService).forEach((service: any) => {
      service.avgCostPerUnit =
        service.totalConsumption > 0
          ? service.totalCost / service.totalConsumption
          : 0;
    });

    res.json({
      success: true,
      data: {
        costByPeriod: Object.values(costByPeriod).sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
        costByService: Object.values(costByService),
        totalSummary: {
          totalInvoices: invoices.length,
          totalAmount: invoices.reduce(
            (sum, inv) => sum + Number(inv.totalAmount),
            0
          ),
          avgInvoiceAmount:
            invoices.length > 0
              ? invoices.reduce(
                  (sum, inv) => sum + Number(inv.totalAmount),
                  0
                ) / invoices.length
              : 0,
        },
        year: currentYear,
        filters: { householdId },
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/analytics/household-comparison - Compare households consumption and costs
router.get("/analytics/household-comparison", async (req, res, next) => {
  try {
    const { year, serviceId } = req.query;
    const currentYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    // First get all billing periods for the year
    const billingPeriods = await prisma.billingPeriod.findMany({
      where: {
        periodName: {
          contains: currentYear.toString(),
        },
      },
    });

    const billingPeriodIds = billingPeriods.map((period) => period.id);

    // Get all active households
    const households = await prisma.household.findMany({
      where: { isActive: true },
      orderBy: { householdNumber: "asc" },
    });

    const householdData = [];

    for (const household of households) {
      // Get invoices for this household using billing period IDs
      const invoices = await prisma.invoice.findMany({
        where: {
          householdId: household.id,
          billingPeriodId: {
            in: billingPeriodIds,
          },
        },
      });

      // Get utility billings for consumption data using billing period IDs
      const utilityBillings = await prisma.utilityBilling.findMany({
        where: {
          householdId: household.id,
          billingPeriodId: {
            in: billingPeriodIds,
          },
          ...(serviceId && { serviceId: serviceId as string }),
        },
        include: {
          service: { select: { name: true, serviceType: true, unit: true } },
        },
      });

      const totalCost = invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0
      );
      const totalUtilityCost = invoices.reduce(
        (sum, inv) => sum + Number(inv.totalUtilityCosts),
        0
      );
      const totalConsumption = utilityBillings.reduce(
        (sum, ub) => sum + Number(ub.consumption),
        0
      );

      householdData.push({
        household: {
          id: household.id,
          number: household.householdNumber,
          owner: household.ownerName,
        },
        costs: {
          total: totalCost,
          utilities: totalUtilityCost,
          average: invoices.length > 0 ? totalCost / invoices.length : 0,
        },
        consumption: {
          total: totalConsumption,
          average:
            utilityBillings.length > 0
              ? totalConsumption / utilityBillings.length
              : 0,
          records: utilityBillings.length,
        },
        invoiceCount: invoices.length,
      });
    }

    res.json({
      success: true,
      data: {
        households: householdData,
        year: currentYear,
        filters: { serviceId },
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
