import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const router = Router();

// Validation schemas
const householdSchema = z.object({
  householdNumber: z.number().int().min(1),
  ownerName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
});

// GET /api/households
router.get("/", async (req, res, next) => {
  try {
    let whereClause: any = { isActive: true };

    // For MEMBER users, only return their own household
    if (req.user?.role === "MEMBER" && req.user?.householdId) {
      whereClause.id = req.user.householdId;
    }

    const households = await prisma.household.findMany({
      where: whereClause,
      orderBy: { householdNumber: "asc" },
      include: {
        _count: {
          select: {
            quarterlyBills: true,
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
    return;
  }
});

// GET /api/households/:id
router.get("/:id", async (req, res, next) => {
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
              orderBy: { readingDate: "desc" },
            },
          },
        },
        quarterlyBills: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!household) {
      return res.status(404).json({
        success: false,
        message: "Household not found",
      });
    }

    return res.json({
      success: true,
      data: household,
    });
  } catch (error) {
    next(error);
    return;
  }
});

// POST /api/households
router.post("/", async (req, res, next) => {
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
    return;
  }
});

// POST /api/households

// PUT /api/households/:id
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = householdSchema.partial().parse(req.body);

    // Check if isActive status is being changed
    const isActiveChanged = validatedData.hasOwnProperty("isActive");

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
    return;
  }
});

// DELETE /api/households/:id
router.delete("/:id", async (req, res, next) => {
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
      message: "Household deactivated successfully",
      data: household,
    });
  } catch (error) {
    next(error);
    return;
  }
});

/**
 * Calculate ownership ratios for equal shares (deprecated - using 1/14 for all)
 * Each household gets an equal share: 1 / total_active_households
 */
async function updateOwnershipRatios() {
  try {
    // Get count of active households
    const activeHouseholdCount = await prisma.household.count({
      where: { isActive: true },
    });

    if (activeHouseholdCount === 0) {
      return;
    }

    // Calculate equal ratio for each household (but don't update since andelstal field is removed)
    const newRatio = 1 / activeHouseholdCount;

    // Note: andelstal field removed from schema - using equal shares (1/14) for all households
    console.log(
      `Equal ownership ratios: ${activeHouseholdCount} households, ${newRatio.toFixed(
        8
      )} each (hardcoded to 1/14)`
    );
  } catch (error) {
    console.error("Error calculating ownership ratios:", error);
    throw error;
  }
}

// PUT /api/households/recalculate-ratios - Admin endpoint to recalculate ownership ratios
router.put("/recalculate-ratios", async (req, res, next) => {
  try {
    await updateOwnershipRatios();

    const activeHouseholds = await prisma.household.findMany({
      where: { isActive: true },
      select: {
        id: true,
        householdNumber: true,
        ownerName: true,
        // andelstal field removed - using equal shares (1/14) for all
      },
    });

    res.json({
      success: true,
      message:
        "Equal ownership shares confirmed (1/14 for all active households)",
      data: {
        totalActiveHouseholds: activeHouseholds.length,
        newRatio: activeHouseholds.length > 0 ? 1 / 14 : null, // Equal shares
        households: activeHouseholds,
      },
    });
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
