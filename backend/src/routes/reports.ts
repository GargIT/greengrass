import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/reports/dashboard - Get dashboard overview data
router.get('/dashboard', async (req, res, next) => {
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
    const pendingQuarterlyBills = await prisma.quarterlyBill.count({
      where: { status: 'pending' },
    });

    const pendingMonthlyBills = await prisma.monthlyBill.count({
      where: { status: 'pending' },
    });

    // Get total revenue for current year
    const quarterlyRevenue = await prisma.quarterlyBill.aggregate({
      where: {
        createdAt: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
        status: 'paid',
      },
      _sum: {
        totalAmount: true,
      },
    });

    const monthlyRevenue = await prisma.monthlyBill.aggregate({
      where: {
        createdAt: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
        status: 'paid',
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
      orderBy: { createdAt: 'desc' },
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
          pendingBills: pendingQuarterlyBills + pendingMonthlyBills,
          totalRevenue: Number(quarterlyRevenue._sum.totalAmount || 0) + Number(monthlyRevenue._sum.totalAmount || 0),
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
router.get('/consumption/:serviceId', async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { year, period } = req.query;

    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    // Get service details
    const service = await prisma.utilityService.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
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
        { billingPeriod: { startDate: 'asc' } },
        { householdMeter: { household: { householdNumber: 'asc' } } },
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
router.get('/billing/:periodId', async (req, res, next) => {
  try {
    const { periodId } = req.params;
    const { type = 'quarterly' } = req.query;

    // Get billing period
    const billingPeriod = await prisma.billingPeriod.findUnique({
      where: { id: periodId },
    });

    if (!billingPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Billing period not found',
      });
    }

    if (type === 'quarterly') {
      const bills = await prisma.quarterlyBill.findMany({
        where: { billingPeriodId: periodId },
        include: {
          household: {
            select: {
              id: true,
              householdNumber: true,
              ownerName: true,
              email: true,
              andelstal: true,
            },
          },
          payments: true,
        },
        orderBy: { household: { householdNumber: 'asc' } },
      });

      const summary = {
        totalBills: bills.length,
        totalAmount: bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0),
        totalUtilityCosts: bills.reduce((sum, bill) => sum + Number(bill.totalUtilityCosts), 0),
        totalMemberFees: bills.reduce((sum, bill) => sum + Number(bill.memberFee), 0),
        totalSharedCosts: bills.reduce((sum, bill) => sum + Number(bill.sharedCosts), 0),
        paidBills: bills.filter(bill => bill.status === 'paid').length,
        pendingBills: bills.filter(bill => bill.status === 'pending').length,
        overdueBills: bills.filter(bill => bill.status === 'overdue').length,
      };

      return res.json({
        success: true,
        data: {
          billingPeriod,
          bills,
          summary,
        },
      });
    } else {
      const bills = await prisma.monthlyBill.findMany({
        where: { billingPeriodId: periodId },
        include: {
          household: {
            select: {
              id: true,
              householdNumber: true,
              ownerName: true,
              email: true,
            },
          },
          payments: true,
        },
        orderBy: { household: { householdNumber: 'asc' } },
      });

      const summary = {
        totalBills: bills.length,
        totalAmount: bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0),
        totalUtilityCosts: bills.reduce((sum, bill) => sum + Number(bill.totalUtilityCosts), 0),
        paidBills: bills.filter(bill => bill.status === 'paid').length,
        pendingBills: bills.filter(bill => bill.status === 'pending').length,
        overdueBills: bills.filter(bill => bill.status === 'overdue').length,
      };

      return res.json({
        success: true,
        data: {
          billingPeriod,
          bills,
          summary,
        },
      });
    }
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/payments - Get payments report
router.get('/payments', async (req, res, next) => {
  try {
    const { year, month, householdId } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

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
          OR: [
            { quarterlyBill: { householdId: householdId as string } },
            { monthlyBill: { householdId: householdId as string } },
          ],
        }),
      },
      include: {
        quarterlyBill: {
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
        monthlyBill: {
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
      orderBy: { paymentDate: 'desc' },
    });

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      quarterlyPayments: payments.filter(p => p.quarterlyBillId).length,
      monthlyPayments: payments.filter(p => p.monthlyBillId).length,
    };

    res.json({
      success: true,
      data: {
        payments,
        summary,
        period: { year: currentYear, month: month ? parseInt(month as string) : null },
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/reports/export/:type - Export data as CSV
router.get('/export/:type', async (req, res, next) => {
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

export default router;
