import { Router, Request, Response } from "express";
import prisma from "prisma";

const router = Router();

/**
 * GET /clubs
 * Query params:
 *  - page (default: 1)
 *  - limit (default: 10)
 *  - publicOnly (default: true)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const publicOnly = req.query.publicOnly !== "false";

    const skip = (page - 1) * limit;

    const clubs = await prisma.bookClub.findMany({
      where: publicOnly ? { isPublic: true } : undefined,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    res.json({
      page,
      limit,
      count: clubs.length,
      data: clubs,
    });
  } catch (error) {
    console.error("Failed to fetch clubs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
