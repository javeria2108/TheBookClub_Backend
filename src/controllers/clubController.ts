import { RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { getFirstValidationMessage } from "../utils/validation";
import { CreateBookClubSchema } from "../schemas";
import type { CreateBookClubSchemaType } from "../schemas/bookClub.schema";
import type {
  CreateClubSuccessData,
  GetClubByIdSuccessData,
  GetClubsSuccessData,
} from "../types/clubResponse.types";
import { raw } from "@prisma/client/runtime/library";

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
    const rawLimit = toPositiveInt(
      req.query.limit as string | undefined,
      DEFAULT_LIMIT,
    );
    const limit = Math.min(rawLimit, MAX_LIMIT);

    const search = (req.query.search as string | undefined)?.trim();
    const isPublicQuery = req.query.isPublic as string | undefined;

    const where: Prisma.BookClubWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (isPublicQuery === "true") where.isPublic = true;
    if (isPublicQuery === "false") where.isPublic = false;

    const skip = (page - 1) * limit;
    const [dbClubs, total] = await prisma.$transaction([
      prisma.bookClub.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { members: true },
          },
        },
      }),
      prisma.bookClub.count({ where }),
    ]);

    const clubs = dbClubs.map((club) => ({
      id: club.id,
      name: club.name,
      description: club.description,
      isPublic: club.isPublic,
      genre: club.genre,
      coverImage: club.coverImage,
      memberCount: club._count.members,
      createdAt: club.createdAt,
    }));

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

export const createClub: RequestHandler = async (req, res) => {
  try {
    const validation = CreateBookClubSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: { message: getFirstValidationMessage(validation.error) },
      });
    }

    const payload: CreateBookClubSchemaType = validation.data;

    const club = await prisma.bookClub.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        isPublic: payload.isPublic,
        genre: payload.genre ?? null,
        coverImage: payload.coverImage ?? null,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    const data: CreateClubSuccessData = {
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        isPublic: club.isPublic,
        genre: club.genre,
        coverImage: club.coverImage,
        memberCount: club._count.members,
        createdAt: club.createdAt,
      },
    };

    return res.status(201).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("POST /api/clubs failed:", error);
    return res.status(500).json({
      error: { message: "Failed to create club" },
    });
  }
};

export const getClubById: RequestHandler = async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      return res.status(400).json({
        error: { message: "Club id is required" },
      });
    }

    const club = await prisma.bookClub.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!club) {
      return res.status(404).json({
        error: { message: "Club not found" },
      });
    }

    const data: GetClubByIdSuccessData = {
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        isPublic: club.isPublic,
        genre: club.genre,
        coverImage: club.coverImage,
        memberCount: club._count.members,
        createdAt: club.createdAt,
      },
    };

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("GET /api/clubs/:id failed:", error);
    return res.status(500).json({
      error: { message: "Failed to fetch club" },
    });
  }
};

export const getMyClubs: RequestHandler = async (req, res) => {
  try {
    const userId = res.locals.userId as string | undefined;

    if (!userId) {
      return res
        .status(401)
        .json({ error: { message: "Authentication required" } });
    }

    const memberships = await prisma.clubMember.findMany({
      where: { userId },
      include: {
        club: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const clubs = memberships.map((m) => ({
      id: m.club.id,
      name: m.club.name,
      description: m.club.description,
      isPublic: m.club.isPublic,
      genre: m.club.genre,
      coverImage: m.club.coverImage,
      memberCount: m.club._count.members,
      joinedAt: m.joinedAt,
      createdAt: m.club.createdAt,
    }));

    return res.status(200).json({ status: "success", data: { clubs } });
  } catch (error) {
    console.error("GET /api/users/me/clubs failed:", error);
    return res
      .status(500)
      .json({ error: { message: "Failed to fetch your clubs" } });
  }
};

export const joinClub: RequestHandler = async (req, res) => {
  try {
    const rawId = req.params.id;
    const clubId = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = res.locals.userId as string | undefined;

    if (!clubId) {
      return res.status(400).json({
        error: { message: "CLub id is required" },
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    const club = await prisma.bookClub.findUnique({
      where: { id: clubId },
      select: { id: true, isPublic: true },
    });

    if (!club) {
      return res.status(404).json({
        error: { message: "Club not found" },
      });
    }

    if (!club.isPublic) {
      return res.status(403).json({
        error: { message: "Private club join requests are not available yet" },
      });
    }

    await prisma.clubMember.create({
      data: {
        clubId,
        userId,
      },
    });

    const memberCount = await prisma.clubMember.count({
      where: { clubId },
    });

    return res.status(201).json({
      status: "success",
      data: {
        clubId,
        memberCount,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error: { message: "You are already a member of this club" },
      });
    }

    console.error("POST /api/clubs/:id/join failed:", error);
    return res.status(500).json({
      error: { message: "Failed to join club" },
    });
  }
};

export const leaveClub: RequestHandler = async (req, res) => {
  try {
    const rawId = req.params.id;
    const clubId = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = res.locals.userId as string | undefined;

    if (!clubId) {
      return res.status(400).json({
        error: { message: "Club id is required" },
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: { message: "Authentication is required" },
      });
    }

    const club = await prisma.bookClub.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      return res.status(404).json({
        error: { message: "Club not found" },
      });
    }

    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });

    if (!membership) {
      return res.status(404).json({
        error: { message: "You are not a member of this club" },
      });
    }

    await prisma.clubMember.delete({
      where: { userId_clubId: { userId, clubId } },
    });

    const memberCount = await prisma.clubMember.count({
      where: { clubId },
    });

    return res.status(200).json({
      status: "success",
      data: {
        clubId,
        memberCount,
      },
    });
  } catch (error) {
    console.error("DELETE /api/clubs/:id/member failed:", error);
    return res.status(500).json({
      error: { message: "Failed to leave club" },
    });
  }
};
