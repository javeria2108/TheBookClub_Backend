import { RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { GetClubsSuccessData } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export const getClubs: RequestHandler = async (req, res) => {
  try {
    const page = toPositiveInt(
      req.query.page as string | undefined,
      DEFAULT_PAGE,
    );
    const raw_limit = toPositiveInt(
      req.query.limit as string | undefined,
      DEFAULT_LIMIT,
    );
    const limit = Math.min(raw_limit, MAX_LIMIT);

    const search = (req.query.search as string | undefined)?.trim();
    const isPublicQuery = req.query.isPublic as string | undefined;

    const where: Prisma.BookClubWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (isPublicQuery === "true") where.isPublic = true;
    if (isPublicQuery === "false") where.isPublic = false;

    const skip = (page - 1) * limit;
    const [clubs, total] = await prisma.$transaction([
      prisma.bookClub.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.bookClub.count({ where }),
    ]);

    const data: GetClubsSuccessData = {
      clubs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("GET /api/clubs failed:", error);
    return res.status(500).json({
      error: { message: "Failed to fetch clubs" },
    });
  }
};
