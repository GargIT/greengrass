import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// Validation schemas
const meterReadingSchema = z.object({
  householdMeterId: z.string().uuid(),
  billingPeriodId: z.string().uuid(),
  meterReading: z.number().min(0),
  readingDate: z.string().datetime(),
  notes: z.string().optional(),
});

const mainMeterReadingSchema = z.object({
  meterId: z.string().uuid(),
  billingPeriodId: z.string().uuid(),
  meterReading: z.number().min(0),
  readingDate: z.string().datetime(),
  notes: z.string().optional(),
});

// GET /api/meter-readings - Get readings for a specific period and service
router.get('/', async (req, res, next) => {
  try {
    const { serviceId, periodId, householdId, type = 'household' } = req.query;

    if (type === 'main') {
      const readings = await prisma.mainMeterReading.findMany({
        where: {
          ...(serviceId && { 
            meter: { 
              serviceId: serviceId as string 
            } 
          }),
          ...(periodId && { billingPeriodId: periodId as string }),
        },
        include: {
          meter: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          billingPeriod: {
            select: {
              id: true,
              periodName: true,
              periodType: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: [
          { billingPeriod: { startDate: 'desc' } },
          { meter: { meterIdentifier: 'asc' } },
        ],
      });

      return res.json({
        success: true,
        data: readings,
      });
    }

    const readings = await prisma.householdMeterReading.findMany({
      where: {
        ...(serviceId && { 
          householdMeter: { 
            serviceId: serviceId as string 
          } 
        }),
        ...(periodId && { billingPeriodId: periodId as string }),
        ...(householdId && { 
          householdMeter: { 
            householdId: householdId as string 
          } 
        }),
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
            service: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        billingPeriod: {
          select: {
            id: true,
            periodName: true,
            periodType: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: [
        { billingPeriod: { startDate: 'desc' } },
        { householdMeter: { household: { householdNumber: 'asc' } } },
      ],
    });

    return res.json({
      success: true,
      data: readings,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/meter-readings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'household' } = req.query;

    if (type === 'main') {
      const reading = await prisma.mainMeterReading.findUnique({
        where: { id },
        include: {
          meter: {
            include: {
              service: true,
            },
          },
          billingPeriod: true,
        },
      });

      if (!reading) {
        return res.status(404).json({
          success: false,
          message: 'Main meter reading not found',
        });
      }

      return res.json({
        success: true,
        data: reading,
      });
    }

    const reading = await prisma.householdMeterReading.findUnique({
      where: { id },
      include: {
        householdMeter: {
          include: {
            household: true,
            service: true,
          },
        },
        billingPeriod: true,
      },
    });

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'Household meter reading not found',
      });
    }

    return res.json({
      success: true,
      data: reading,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// POST /api/meter-readings
router.post('/', async (req, res, next) => {
  try {
    const { type = 'household' } = req.body;

    if (type === 'main') {
      const validatedData = mainMeterReadingSchema.parse(req.body);
      
      const reading = await prisma.mainMeterReading.create({
        data: {
          ...validatedData,
          readingDate: new Date(validatedData.readingDate),
        },
        include: {
          meter: {
            include: {
              service: true,
            },
          },
          billingPeriod: true,
        },
      });

      return res.status(201).json({
        success: true,
        data: reading,
      });
    }

    const validatedData = meterReadingSchema.parse(req.body);

    // Check for duplicate reading (if unique constraint exists)
    const existingReading = await prisma.householdMeterReading.findFirst({
      where: {
        householdMeterId: validatedData.householdMeterId,
        billingPeriodId: validatedData.billingPeriodId,
      },
    });

    if (existingReading) {
      return res.status(400).json({
        success: false,
        message: 'Reading already exists for this meter and billing period',
      });
    }

    const reading = await prisma.householdMeterReading.create({
      data: {
        ...validatedData,
        readingDate: new Date(validatedData.readingDate),
      },
      include: {
        householdMeter: {
          include: {
            household: true,
            service: true,
          },
        },
        billingPeriod: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: reading,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// PUT /api/meter-readings/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'household' } = req.body;

    if (type === 'main') {
      const validatedData = mainMeterReadingSchema.partial().parse(req.body);
      
      const reading = await prisma.mainMeterReading.update({
        where: { id },
        data: {
          ...validatedData,
          ...(validatedData.readingDate && {
            readingDate: new Date(validatedData.readingDate),
          }),
        },
        include: {
          meter: {
            include: {
              service: true,
            },
          },
          billingPeriod: true,
        },
      });

      return res.json({
        success: true,
        data: reading,
      });
    }

    const validatedData = meterReadingSchema.partial().parse(req.body);

    const reading = await prisma.householdMeterReading.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.readingDate && {
          readingDate: new Date(validatedData.readingDate),
        }),
      },
      include: {
        householdMeter: {
          include: {
            household: true,
            service: true,
          },
        },
        billingPeriod: true,
      },
    });

    return res.json({
      success: true,
      data: reading,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// DELETE /api/meter-readings/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'household' } = req.query;

    if (type === 'main') {
      await prisma.mainMeterReading.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Main meter reading deleted successfully',
      });
    }

    await prisma.householdMeterReading.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Household meter reading deleted successfully',
    });
  } catch (error) {
    next(error);
    return;
  }
});

// POST /api/meter-readings/bulk - Bulk create readings for a billing period
router.post('/bulk', async (req, res, next) => {
  try {
    const { billingPeriodId, readings, type = 'household' } = req.body;

    if (!billingPeriodId || !Array.isArray(readings)) {
      return res.status(400).json({
        success: false,
        message: 'billingPeriodId and readings array are required',
      });
    }

    if (type === 'main') {
      const validatedReadings = readings.map(reading => 
        mainMeterReadingSchema.parse({
          ...reading,
          billingPeriodId,
        })
      );

      const result = await prisma.$transaction(
        validatedReadings.map(reading =>
          prisma.mainMeterReading.create({
            data: {
              ...reading,
              readingDate: new Date(reading.readingDate),
            },
          })
        )
      );

      return res.status(201).json({
        success: true,
        data: result,
        message: `${result.length} main meter readings created successfully`,
      });
    }

    const validatedReadings = readings.map(reading => 
      meterReadingSchema.parse({
        ...reading,
        billingPeriodId,
      })
    );

    const result = await prisma.$transaction(
      validatedReadings.map(reading =>
        prisma.householdMeterReading.create({
          data: {
            ...reading,
            readingDate: new Date(reading.readingDate),
          },
        })
      )
    );

    return res.status(201).json({
      success: true,
      data: result,
      message: `${result.length} household meter readings created successfully`,
    });
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
