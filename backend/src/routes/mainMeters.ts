import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/main-meters - Get all main meters
router.get("/", async (req, res, next) => {
  try {
    const { serviceId } = req.query;

    const whereClause: any = {};
    if (serviceId) whereClause.serviceId = serviceId as string;

    const mainMeters = await prisma.mainMeter.findMany({
      where: whereClause,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            unit: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ service: { name: "asc" } }, { meterIdentifier: "asc" }],
    });

    res.json({
      success: true,
      data: mainMeters,
    });
  } catch (error) {
    next(error);
    return;
  }
});

export default router;
