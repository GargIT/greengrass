import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// Validation schemas
const householdSchema = z.object({
  householdNumber: z.number().int().min(1),
  ownerName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  andelstal: z.number().min(0).max(1).optional(),
  annualMemberFee: z.number().min(0).optional(),
});

/**
 * @swagger
 * tags:
 *   name: Households
 *   description: Household management endpoints
 */

/**
 * @swagger
 * /api/households:
 *   get:
 *     summary: Get all active households
 *     tags: [Households]
 *     responses:
 *       200:
 *         description: List of households
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Household'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
// GET /api/households
router.get('/', async (req, res, next) => {
  try {
    const households = await prisma.household.findMany({
      where: { isActive: true },
      orderBy: { householdNumber: 'asc' },
      include: {
        _count: {
          select: {
            quarterlyBills: true,
            monthlyBills: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: households,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/households/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        householdMeters: {
          include: {
            service: true,
            readings: {
              take: 5,
              orderBy: { readingDate: 'desc' },
            },
          },
        },
        quarterlyBills: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        monthlyBills: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'Household not found',
      });
    }

    return res.json({
      success: true,
      data: household,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/households
router.post('/', async (req, res, next) => {
  try {
    const validatedData = householdSchema.parse(req.body);

    const household = await prisma.household.create({
      data: validatedData,
    });

    // Update ownership ratios for all households after creating a new one
    await updateOwnershipRatios();

    res.status(201).json({
      success: true,
      data: household,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/households:
 *   post:
 *     summary: Create a new household
 *     tags: [Households]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - householdNumber
 *               - ownerName
 *             properties:
 *               householdNumber:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 14
 *                 example: 1
 *               ownerName:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phone:
 *                 type: string
 *                 example: "070-123-4567"
 *               address:
 *                 type: string
 *                 example: "Gröngräset 1"
 *               andelstal:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.07142857
 *               annualMemberFee:
 *                 type: number
 *                 minimum: 0
 *                 example: 3000
 *     responses:
 *       201:
 *         description: Household created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Household'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
// POST /api/households

// PUT /api/households/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = householdSchema.partial().parse(req.body);

    // Check if isActive status is being changed
    const isActiveChanged = validatedData.hasOwnProperty('isActive');

    const household = await prisma.household.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    // Update ownership ratios if active status changed
    if (isActiveChanged) {
      await updateOwnershipRatios();
    }

    res.json({
      success: true,
      data: household,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/households/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const household = await prisma.household.update({
      where: { id },
      data: { isActive: false },
    });

    // Update ownership ratios after deactivating a household
    await updateOwnershipRatios();

    res.json({
      success: true,
      message: 'Household deactivated successfully',
      data: household,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate and update ownership ratios (andelstal) for all active households
 * Each household gets an equal share: 1 / total_active_households
 */
async function updateOwnershipRatios() {
  try {
    // Get count of active households
    const activeHouseholdCount = await prisma.household.count({
      where: { isActive: true }
    });

    if (activeHouseholdCount === 0) {
      return;
    }

    // Calculate equal ratio for each household
    const newRatio = 1 / activeHouseholdCount;

    // Update all active households with the new ratio
    await prisma.household.updateMany({
      where: { isActive: true },
      data: { andelstal: newRatio }
    });

    console.log(`Updated ownership ratios: ${activeHouseholdCount} households, ${newRatio.toFixed(8)} each`);
  } catch (error) {
    console.error('Error updating ownership ratios:', error);
    throw error;
  }
}

// PUT /api/households/recalculate-ratios - Admin endpoint to recalculate ownership ratios
router.put('/recalculate-ratios', async (req, res, next) => {
  try {
    await updateOwnershipRatios();
    
    const activeHouseholds = await prisma.household.findMany({
      where: { isActive: true },
      select: { id: true, householdNumber: true, ownerName: true, andelstal: true }
    });

    res.json({
      success: true,
      message: 'Ownership ratios recalculated successfully',
      data: {
        totalActiveHouseholds: activeHouseholds.length,
        newRatio: activeHouseholds.length > 0 ? activeHouseholds[0].andelstal : null,
        households: activeHouseholds
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
