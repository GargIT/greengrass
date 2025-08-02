import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// Validation schemas
const utilityServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  unit: z.string().min(1).max(20),
  unitPrice: z.number().min(0).optional(),
  serviceType: z.enum(['WATER', 'ELECTRICITY', 'HEATING', 'INTERNET', 'OTHER']).optional(),
  isActive: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  billingFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional(),
});

// GET /api/utility-services
router.get('/', async (req, res, next) => {
  try {
    const services = await prisma.utilityService.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            mainMeters: true,
            householdMeters: true,
          },
        },
        pricing: {
          where: { isActive: true },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/utility-services/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const service = await prisma.utilityService.findUnique({
      where: { id },
      include: {
        mainMeters: true,
        householdMeters: {
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
        pricing: {
          orderBy: { effectiveDate: 'desc' },
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Utility service not found',
      });
    }

    return res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/utility-services
router.post('/', async (req, res, next) => {
  try {
    const validatedData = utilityServiceSchema.parse(req.body);

    const service = await prisma.utilityService.create({
      data: validatedData,
    });

    res.status(201).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/utility-services/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = utilityServiceSchema.partial().parse(req.body);

    const service = await prisma.utilityService.update({
      where: { id },
      data: validatedData,
    });

    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/utility-services/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const service = await prisma.utilityService.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mainMeters: true,
            householdMeters: true,
            utilityBilling: true,
          },
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Utility service not found',
      });
    }

    // Check if service has related data
    const hasRelatedData = service._count.mainMeters > 0 || 
                          service._count.householdMeters > 0 || 
                          service._count.utilityBilling > 0;

    if (hasRelatedData) {
      // Soft delete by setting isActive to false
      await prisma.utilityService.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: 'Utility service deactivated (soft delete)',
      });
    } else {
      // Hard delete if no related data
      await prisma.utilityService.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Utility service deleted',
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
