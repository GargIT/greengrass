import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// Validation schemas
const utilityServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  unit: z.string().min(1).max(20),
  unitPrice: z.number().min(0).default(0),
  serviceType: z.enum(['WATER', 'ELECTRICITY', 'HEATING', 'INTERNET', 'OTHER']).default('OTHER'),
  isActive: z.boolean().default(true),
  isMandatory: z.boolean().default(false),
  billingFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']).default('QUARTERLY'),
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
    return;
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
    return;
  }
});

// POST /api/utility-services
router.post('/', async (req, res, next) => {
  try {
    console.log('POST request body:', JSON.stringify(req.body, null, 2));
    
    // Preprocess the data to handle type conversions
    const preprocessedData = {
      ...req.body,
      unitPrice: req.body.unitPrice !== undefined && req.body.unitPrice !== null && !isNaN(Number(req.body.unitPrice)) 
        ? Number(req.body.unitPrice) 
        : 0,
    };
    
    const validatedData = utilityServiceSchema.parse(preprocessedData);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));

    const service = await prisma.utilityService.create({
      data: validatedData,
    });

    res.status(201).json({
      success: true,
      data: service,
    });
    return;
  } catch (error) {
    console.error('POST /api/utility-services error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {} as Record<string, string>)
      });
    }
    next(error);
    return;
  }
});

// PUT /api/utility-services/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('PUT request body:', JSON.stringify(req.body, null, 2));
    
    // Preprocess the data to handle type conversions
    const preprocessedData = {
      ...req.body,
      unitPrice: req.body.unitPrice !== undefined && req.body.unitPrice !== null && !isNaN(Number(req.body.unitPrice)) 
        ? Number(req.body.unitPrice) 
        : undefined, // Keep as undefined for updates if not provided
    };
    
    const validatedData = utilityServiceSchema.partial().parse(preprocessedData);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));

    const service = await prisma.utilityService.update({
      where: { id },
      data: validatedData,
    });

    res.json({
      success: true,
      data: service,
    });
    return;
  } catch (error) {
    console.error('PUT /api/utility-services/:id error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {} as Record<string, string>)
      });
    }
    next(error);
    return;
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
      // Soft delete by setting isActive to false when service is in use
      await prisma.utilityService.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: 'Utility service deactivated because it has related data (meters or billing records)',
        data: {
          action: 'soft_delete',
          relatedData: {
            mainMeters: service._count.mainMeters,
            householdMeters: service._count.householdMeters,
            billingRecords: service._count.utilityBilling
          }
        }
      });
    } else {
      // Hard delete if no related data - service can be safely removed
      await prisma.utilityService.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Utility service permanently deleted',
        data: {
          action: 'hard_delete',
          deletedServiceId: id
        }
      });
    }
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
