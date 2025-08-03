import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const router = Router();

// Validation schemas
const createHouseholdMeterSchema = z.object({
  householdId: z.string().uuid(),
  serviceId: z.string().uuid(),
  meterSerial: z.string().optional(),
  installationDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
});

const updateHouseholdMeterSchema = z.object({
  meterSerial: z.string().optional(),
  installationDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  isActive: z.boolean().optional(),
});

// GET /api/household-meters - Get all household meter connections
router.get("/", async (req, res, next) => {
  try {
    const { householdId, serviceId } = req.query;

    const whereClause: any = {};

    // For MEMBER users, restrict to their own household
    if (req.user?.role === "MEMBER" && req.user?.householdId) {
      whereClause.householdId = req.user.householdId;
    } else {
      if (householdId) whereClause.householdId = householdId as string;
    }

    if (serviceId) whereClause.serviceId = serviceId as string;

    const householdMeters = await prisma.householdMeter.findMany({
      where: whereClause,
      include: {
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
            isActive: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            unit: true,
            serviceType: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            readings: true,
          },
        },
      },
      orderBy: [
        { household: { householdNumber: "asc" } },
        { service: { name: "asc" } },
      ],
    });

    return res.json({
      success: true,
      data: householdMeters,
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/household-meters/household/:householdId - Get all services connected to a household
router.get("/household/:householdId", async (req, res, next) => {
  try {
    const { householdId } = req.params;

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        householdMeters: {
          include: {
            service: true,
            _count: {
              select: {
                readings: true,
              },
            },
          },
          orderBy: {
            service: { name: "asc" },
          },
        },
      },
    });

    if (!household) {
      return res.status(404).json({
        success: false,
        error: "Household not found",
      });
    }

    return res.json({
      success: true,
      data: {
        household: {
          id: household.id,
          householdNumber: household.householdNumber,
          ownerName: household.ownerName,
        },
        connections: household.householdMeters,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/household-meters/service/:serviceId - Get all households connected to a service
router.get("/service/:serviceId", async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    const service = await prisma.utilityService.findUnique({
      where: { id: serviceId },
      include: {
        householdMeters: {
          include: {
            household: true,
            _count: {
              select: {
                readings: true,
              },
            },
          },
          orderBy: {
            household: { householdNumber: "asc" },
          },
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: "Utility service not found",
      });
    }

    return res.json({
      success: true,
      data: {
        service: {
          id: service.id,
          name: service.name,
          serviceType: service.serviceType,
          unit: service.unit,
        },
        connections: service.householdMeters,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/household-meters - Create a new household-service connection
router.post("/", async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = createHouseholdMeterSchema.parse(req.body);

    // Check if household exists
    const household = await prisma.household.findUnique({
      where: { id: validatedData.householdId },
    });

    if (!household) {
      return res.status(404).json({
        success: false,
        error: "Household not found",
      });
    }

    // Check if service exists
    const service = await prisma.utilityService.findUnique({
      where: { id: validatedData.serviceId },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: "Utility service not found",
      });
    }

    // Check if connection already exists
    const existingConnection = await prisma.householdMeter.findUnique({
      where: {
        householdId_serviceId: {
          householdId: validatedData.householdId,
          serviceId: validatedData.serviceId,
        },
      },
    });

    if (existingConnection) {
      return res.status(409).json({
        success: false,
        error: "Connection between household and service already exists",
      });
    }

    // Create the connection
    const householdMeter = await prisma.householdMeter.create({
      data: {
        householdId: validatedData.householdId,
        serviceId: validatedData.serviceId,
        meterSerial: validatedData.meterSerial,
        installationDate: validatedData.installationDate,
      },
      include: {
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
            isActive: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            unit: true,
            serviceType: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            readings: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: householdMeter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }
    return next(error);
  }
});

// PUT /api/household-meters/:id - Update a household-service connection
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = updateHouseholdMeterSchema.parse(req.body);

    // Check if connection exists
    const existingConnection = await prisma.householdMeter.findUnique({
      where: { id },
    });

    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        error: "Household meter connection not found",
      });
    }

    // Update the connection
    const householdMeter = await prisma.householdMeter.update({
      where: { id },
      data: validatedData,
      include: {
        household: {
          select: {
            id: true,
            householdNumber: true,
            ownerName: true,
            isActive: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            unit: true,
            serviceType: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            readings: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: householdMeter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }
    return next(error);
  }
});

// DELETE /api/household-meters/:id - Remove a household-service connection
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if connection exists
    const existingConnection = await prisma.householdMeter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            readings: true,
          },
        },
      },
    });

    if (!existingConnection) {
      return res.status(404).json({
        success: false,
        error: "Household meter connection not found",
      });
    }

    // Check if there are existing meter readings
    if (existingConnection._count.readings > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot delete connection with existing meter readings. Please remove readings first or set isActive to false.",
      });
    }

    // Delete the connection
    await prisma.householdMeter.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Household meter connection deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/household-meters/bulk - Create multiple connections at once
router.post("/bulk", async (req, res, next) => {
  try {
    const { connections } = req.body;

    if (!Array.isArray(connections)) {
      return res.status(400).json({
        success: false,
        error: "Connections must be an array",
      });
    }

    // Validate all connections
    const validatedConnections = connections.map((conn) =>
      createHouseholdMeterSchema.parse(conn)
    );

    // Check for duplicate connections in the request
    const uniqueConnections = new Set();
    for (const conn of validatedConnections) {
      const key = `${conn.householdId}-${conn.serviceId}`;
      if (uniqueConnections.has(key)) {
        return res.status(400).json({
          success: false,
          error: `Duplicate connection found in request: household ${conn.householdId} and service ${conn.serviceId}`,
        });
      }
      uniqueConnections.add(key);
    }

    // Create all connections in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const conn of validatedConnections) {
        // Check if connection already exists
        const existing = await tx.householdMeter.findUnique({
          where: {
            householdId_serviceId: {
              householdId: conn.householdId,
              serviceId: conn.serviceId,
            },
          },
        });

        if (!existing) {
          const newConnection = await tx.householdMeter.create({
            data: conn,
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
                  serviceType: true,
                },
              },
            },
          });
          created.push(newConnection);
        }
      }

      return created;
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: `Created ${result.length} new connections`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }
    return next(error);
  }
});

export default router;
