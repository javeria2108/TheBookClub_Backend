import type { Request, RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { getFirstValidationMessage } from "../utils/validation";
import { CreateBookClubSchema } from "../schemas";
import jwt from "jsonwebtoken";
import type { CreateBookClubSchemaType } from "../schemas/bookClub.schema";
import type {
  CreateClubSuccessData,
  GetClubByIdSuccessData,
  GetClubsSuccessData,
} from "../types/clubResponse.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type JwtPayload = {
  id?: string;
};

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getOptionalUserIdFromRequest(req: Request) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return undefined;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    return payload.id;
  } catch {
    return undefined;
  }
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

    const userId = res.locals.userId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    // Create club and set creator as OWNER in a transaction
    const createdClub = await prisma.$transaction(async (tx) => {
      const c = await tx.bookClub.create({
        data: {
          name: payload.name,
          description: payload.description ?? null,
          isPublic: payload.isPublic,
          genre: payload.genre ?? null,
          coverImage: payload.coverImage ?? null,
        },
      });

      await tx.clubMember.create({
        data: {
          clubId: c.id,
          userId,
          role: "OWNER",
        },
      });

      return c;
    });

    const data: CreateClubSuccessData = {
      club: {
        id: createdClub.id,
        name: createdClub.name,
        description: createdClub.description,
        isPublic: createdClub.isPublic,
        genre: createdClub.genre,
        coverImage: createdClub.coverImage,
        memberCount: 1,
        createdAt: createdClub.createdAt,
      },
    };

    return res.status(201).json({ status: "success", data });
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
    const userId = getOptionalUserIdFromRequest(req);

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

    let isMember = false;
    let userRole: "MEMBER" | "MODERATOR" | "OWNER" | null = null;
    let hasPendingJoinRequest = false;
    let pendingJoinRequestId: string | null = null;

    if (userId) {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId, clubId: id } },
        select: { role: true },
      });
      if (membership) {
        isMember = true;
        userRole = membership.role;
      } else {
        const pendingRequest = await prisma.clubJoinRequest.findFirst({
          where: {
            clubId: id,
            userId,
            status: "PENDING",
          },
          select: { id: true },
        });

        hasPendingJoinRequest = Boolean(pendingRequest);
        pendingJoinRequestId = pendingRequest?.id ?? null;
      }
    }

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
        isMember,
        memberRole: userRole,
        hasPendingJoinRequest,
        pendingJoinRequestId,
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

export const cancelJoinRequest: RequestHandler = async (req, res) => {
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
        error: { message: "Authentication required" },
      });
    }

    const request = await prisma.clubJoinRequest.findFirst({
      where: {
        clubId,
        userId,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (!request) {
      return res.status(404).json({
        error: { message: "No pending join request found for this club" },
      });
    }

    await prisma.clubJoinRequest.delete({
      where: { id: request.id },
    });

    return res.status(200).json({
      status: "success",
      data: {
        message: "Join request cancelled",
      },
    });
  } catch (error) {
    console.error("DELETE /api/clubs/:id/join-request failed:", error);
    return res.status(500).json({
      error: { message: "Failed to cancel join request" },
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
      // For private clubs, create or reuse an existing join request
      // If a PENDING request already exists, report conflict. If a previous
      // request exists but is not PENDING (APPROVED/REJECTED), reset it to
      // PENDING so the user can re-request after leaving.
      const existingRequest = await prisma.clubJoinRequest.findUnique({
        where: { userId_clubId: { userId, clubId } },
      });

      if (existingRequest) {
        if (existingRequest.status === "PENDING") {
          return res.status(409).json({
            error: { message: "You have already requested to join this club" },
          });
        }

        // Reset historical request to PENDING so user can request again.
        await prisma.clubJoinRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: "PENDING",
            reviewedAt: null,
            reviewedByUserId: null,
          },
        });

        return res.status(201).json({
          status: "success",
          data: {
            message: "Join request created. Waiting for approval.",
          },
        });
      }

      // No existing request — create a new one
      try {
        await prisma.clubJoinRequest.create({ data: { clubId, userId } });
        return res.status(201).json({
          status: "success",
          data: { message: "Join request created. Waiting for approval." },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return res.status(409).json({
            error: { message: "You have already requested to join this club" },
          });
        }
        throw error;
      }
    }

    // For public clubs, directly add as member
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
      select: { role: true },
    });

    if (!membership) {
      return res.status(404).json({
        error: { message: "You are not a member of this club" },
      });
    }

    if (membership.role === "OWNER") {
      const remainingPrivilegedMembers = await prisma.clubMember.count({
        where: {
          clubId,
          userId: { not: userId },
          role: { in: ["OWNER", "MODERATOR"] },
        },
      });

      if (remainingPrivilegedMembers === 0) {
        return res.status(400).json({
          error: {
            message:
              "Transfer ownership or add a moderator before leaving this club",
          },
        });
      }
    }

    await prisma.clubMember.delete({
      where: { userId_clubId: { userId, clubId } },
    });

    await prisma.clubJoinRequest.deleteMany({
      where: { clubId, userId },
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

export const getJoinRequests: RequestHandler = async (req, res) => {
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
        error: { message: "Authentication required" },
      });
    }

    // Check if user is owner or moderator of this club
    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { role: true },
    });

    if (
      !membership ||
      (membership.role !== "OWNER" && membership.role !== "MODERATOR")
    ) {
      return res.status(403).json({
        error: { message: "Only owners and moderators can view join requests" },
      });
    }

    const requests = await prisma.clubJoinRequest.findMany({
      where: { clubId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      status: "success",
      data: {
        requests: requests.map((r) => ({
          id: r.id,
          userId: r.userId,
          username: r.user.username,
          email: r.user.email,
          status: r.status,
          createdAt: r.createdAt,
          reviewedAt: r.reviewedAt,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/clubs/:id/join-requests failed:", error);
    return res.status(500).json({
      error: { message: "Failed to fetch join requests" },
    });
  }
};

export const updateJoinRequest: RequestHandler = async (req, res) => {
  try {
    const rawClubId = req.params.id;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    const rawReqId = req.params.reqId;
    const requestId = Array.isArray(rawReqId) ? rawReqId[0] : rawReqId;
    const userId = res.locals.userId as string | undefined;
    const { action } = req.body;

    if (!clubId || !requestId) {
      return res.status(400).json({
        error: { message: "Club id and request id are required" },
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({
        error: { message: "Action must be APPROVE or REJECT" },
      });
    }

    // Check if user is owner or moderator of this club
    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { role: true },
    });

    if (
      !membership ||
      (membership.role !== "OWNER" && membership.role !== "MODERATOR")
    ) {
      return res.status(403).json({
        error: {
          message: "Only owners and moderators can review join requests",
        },
      });
    }

    // Get the request
    const request = await prisma.clubJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.clubId !== clubId) {
      return res.status(404).json({
        error: { message: "Join request not found" },
      });
    }

    if (request.status !== "PENDING") {
      return res.status(409).json({
        error: { message: "This request has already been reviewed" },
      });
    }

    if (action === "APPROVE") {
      // Approve: move user from request to member
      await prisma.$transaction(async (tx) => {
        // Create club member
        await tx.clubMember.create({
          data: {
            clubId,
            userId: request.userId,
          },
        });

        // Update request status
        await tx.clubJoinRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedByUserId: userId,
          },
        });
      });

      return res.status(200).json({
        status: "success",
        data: { message: "Join request approved" },
      });
    } else {
      // Reject: just update request status
      await prisma.clubJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedByUserId: userId,
        },
      });

      return res.status(200).json({
        status: "success",
        data: { message: "Join request rejected" },
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error: { message: "User is already a member of this club" },
      });
    }

    console.error("PATCH /api/clubs/:id/join-requests/:reqId failed:", error);
    return res.status(500).json({
      error: { message: "Failed to update join request" },
    });
  }
};

export const updateMemberRole: RequestHandler = async (req, res) => {
  try {
    const rawClubId = req.params.id;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    const rawMemberId = req.params.userId;
    const targetUserId = Array.isArray(rawMemberId)
      ? rawMemberId[0]
      : rawMemberId;
    const authUserId = res.locals.userId as string | undefined;
    const { role } = req.body;

    if (!clubId || !targetUserId) {
      return res.status(400).json({
        error: { message: "Club id and user id are required" },
      });
    }

    if (!authUserId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    if (!role || !["MEMBER", "MODERATOR"].includes(role)) {
      return res.status(400).json({
        error: { message: "Role must be MEMBER or MODERATOR" },
      });
    }

    // Only owners can manage roles
    const authMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: authUserId, clubId } },
      select: { role: true },
    });

    if (!authMembership || authMembership.role !== "OWNER") {
      return res.status(403).json({
        error: { message: "Only club owners can manage member roles" },
      });
    }

    // Cannot change owner's role
    if (targetUserId === authUserId) {
      return res.status(400).json({
        error: { message: "You cannot change your own role" },
      });
    }

    // Get target member
    const targetMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: targetUserId, clubId } },
    });

    if (!targetMembership) {
      return res.status(404).json({
        error: { message: "Member not found in this club" },
      });
    }

    if (targetMembership.role === "OWNER") {
      return res.status(400).json({
        error: { message: "Cannot change the role of the club owner" },
      });
    }

    // Update member role
    const updatedMembership = await prisma.clubMember.update({
      where: { id: targetMembership.id },
      data: { role },
    });

    return res.status(200).json({
      status: "success",
      data: {
        memberId: updatedMembership.id,
        userId: updatedMembership.userId,
        role: updatedMembership.role,
      },
    });
  } catch (error) {
    console.error("PATCH /api/clubs/:id/members/:userId/role failed:", error);
    return res.status(500).json({
      error: { message: "Failed to update member role" },
    });
  }
};
