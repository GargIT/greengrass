import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["ADMIN", "MEMBER"]),
  householdId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
  householdId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/users - Get all users (Admin only)
router.get("/", authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: users,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// GET /api/users/:id - Get user by ID (Admin only)
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { id } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// POST /api/users - Create new user (Admin only)
router.post("/", authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const validatedData = createUserSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // If householdId is provided, check if household exists
    if (validatedData.householdId) {
      const household = await prisma.household.findUnique({
        where: { id: validatedData.householdId },
      });

      if (!household) {
        return res.status(400).json({
          success: false,
          message: "Household not found",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
        householdId: validatedData.householdId,
        isActive: validatedData.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: user,
    });
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    next(error);
    return;
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { id } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const validatedData = updateUserSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if email already exists (if email is being updated)
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }
    }

    // If householdId is provided, check if household exists
    if (validatedData.householdId) {
      const household = await prisma.household.findUnique({
        where: { id: validatedData.householdId },
      });

      if (!household) {
        return res.status(400).json({
          success: false,
          message: "Household not found",
        });
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: user,
    });
    return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    next(error);
    return;
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { id } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Prevent deleting own account
    if (req.user?.userId === id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
