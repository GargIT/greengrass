import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// Validation schemas
const householdSchema = z.object({
  householdNumber: z.number().int().min(1).max(14),
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

    const household = await prisma.household.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

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

    res.json({
      success: true,
      message: 'Household deactivated successfully',
      data: household,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
