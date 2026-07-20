import type { Request, RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { getFirstValidationMessage } from "../utils/validation";
import { notify } from "../services/notificationService";
import { CreateBookClubSchema, UpdateBookClubSchema } from "../schemas";
import { authConfig } from "../config/authConfig";
import { verifyAuthToken } from "../utils/authToken";
import { getCookieValue } from "../utils/cookies";
import type {
  CreateBookClubSchemaType,
  UpdateBookClubSchemaType,
} from "../schemas/bookClub.schema";
import type {
  CreateClubSuccessData,
  GetClubByIdSuccessData,
  GetClubsSuccessData,
} from "../types/clubResponse.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getOptionalUserIdFromRequest(req: Request) {
  const token = getCookieValue(req.headers.cookie, authConfig.cookieName);

  if (!token) {
    return undefined;
  }

  try {
    return verifyAuthToken(token).userId;
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

    // Create club and set creator as OWNER in a transaction.
    const createdClub = await prisma.$transaction(async (tx) => {
      const c = await tx.bookClub.create({
        data: {
          name: payload.name,
          description: payload.description ?? null,
          isPublic: payload.isPublic,
          genre: payload.genre ?? null,
          coverImage: payload.coverImage,
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2028"
    ) {
      console.error("POST /api/clubs failed (P2028):", error);
      return res.status(503).json({
        error: { message: "Failed to create club. Please try again." },
      });
    }

    console.error("POST /api/clubs failed:", error);
    return res.status(500).json({
      error: { message: "Failed to create club. Please try again." },
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
      select: { id: true, name: true, isPublic: true },
    });

    if (!club) {
      return res.status(404).json({
        error: { message: "Club not found" },
      });
    }

    if (!club.isPublic) {
      // For private clubs, keep only pending requests as active state.
      // Any stale reviewed request row is deleted before creating a new one.
      const existingRequest = await prisma.clubJoinRequest.findUnique({
        where: { userId_clubId: { userId, clubId } },
      });

      if (existingRequest?.status === "PENDING") {
        return res.status(409).json({
          error: { message: "You have already requested to join this club" },
        });
      }

      if (existingRequest) {
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
          data: { message: "Join request created. Waiting for approval." },
        });
      }

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

    await notify({
      recipients: [userId],
      type: "CLUB_JOINED",
      actorId: userId,
      clubId,
      title: `Welcome to ${club.name}`,
      body: "You are now a member of this reading circle.",
      actionUrl: `/clubs/${clubId}`,
      entityType: "CLUB",
      entityId: clubId,
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
      return res.status(400).json({
        error: {
          message:
            "Club owners cannot leave directly. Transfer ownership or delete the club first.",
        },
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
      where: { clubId, status: "PENDING" },
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
      include: { club: { select: { name: true } } },
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
      // Approve: move user from request to member and remove request record.
      await prisma.$transaction(async (tx) => {
        // Create club member
        await tx.clubMember.create({
          data: {
            clubId,
            userId: request.userId,
          },
        });

        // Delete request to avoid keeping review history rows.
        await tx.clubJoinRequest.delete({
          where: { id: requestId },
        });
      });

      await notify({
        recipients: [request.userId],
        type: "JOIN_REQUEST_APPROVED",
        actorId: userId,
        clubId,
        title: `You are in ${request.club.name}`,
        body: "Your request to join this club was approved.",
        actionUrl: `/clubs/${clubId}`,
        entityType: "JOIN_REQUEST",
        entityId: requestId,
      });

      return res.status(200).json({
        status: "success",
        data: { message: "Join request approved" },
      });
    } else {
      // Reject: remove request to avoid keeping review history rows.
      await prisma.clubJoinRequest.delete({
        where: { id: requestId },
      });

      await notify({
        recipients: [request.userId],
        type: "JOIN_REQUEST_REJECTED",
        actorId: userId,
        clubId,
        title: `${request.club.name} did not approve your request`,
        body: "Your request to join this private club was rejected.",
        actionUrl: "/clubs",
        entityType: "JOIN_REQUEST",
        entityId: requestId,
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

export const getClubMembers: RequestHandler = async (req, res) => {
  try {
    const rawClubId = req.params.id;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    const authUserId = res.locals.userId as string | undefined;

    if (!clubId) {
      return res.status(400).json({
        error: { message: "Club id is required" },
      });
    }

    if (!authUserId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    const authMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: authUserId, clubId } },
      select: { role: true },
    });

    if (!authMembership) {
      return res.status(403).json({
        error: { message: "Only club members can view club members" },
      });
    }

    const members = await prisma.clubMember.findMany({
      where: { clubId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: authMembership.role === "OWNER",
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return res.status(200).json({
      status: "success",
      data: {
        members: members.map((m) => ({
          userId: m.userId,
          username: m.user.username,
          email: authMembership.role === "OWNER" ? m.user.email : null,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/clubs/:id/members failed:", error);
    return res.status(500).json({
      error: { message: "Failed to fetch club members" },
    });
  }
};

export const transferClubOwnership: RequestHandler = async (req, res) => {
  try {
    const rawClubId = req.params.id;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    const authUserId = res.locals.userId as string | undefined;
    const { targetUserId } = req.body as { targetUserId?: string };

    if (!clubId || !targetUserId) {
      return res.status(400).json({
        error: { message: "Club id and target user id are required" },
      });
    }

    if (!authUserId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    if (targetUserId === authUserId) {
      return res.status(400).json({
        error: { message: "Cannot transfer ownership to yourself" },
      });
    }

    const authMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: authUserId, clubId } },
    });

    if (!authMembership || authMembership.role !== "OWNER") {
      return res.status(403).json({
        error: { message: "Only club owners can transfer ownership" },
      });
    }

    const targetMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: targetUserId, clubId } },
    });

    if (!targetMembership) {
      return res.status(404).json({
        error: { message: "Target user is not a member of this club" },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.clubMember.update({
        where: { id: targetMembership.id },
        data: { role: "OWNER" },
      });

      await tx.clubMember.update({
        where: { id: authMembership.id },
        data: { role: "MEMBER" },
      });
    });

    return res.status(200).json({
      status: "success",
      data: { message: "Ownership transferred successfully" },
    });
  } catch (error) {
    console.error("PATCH /api/clubs/:id/ownership failed:", error);
    return res.status(500).json({
      error: { message: "Failed to transfer ownership" },
    });
  }
};

export const updateClub: RequestHandler = async (req, res) => {
  try {
    const rawClubId = req.params.id;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    const authUserId = res.locals.userId as string | undefined;

    if (!clubId) {
      return res.status(400).json({
        error: { message: "Club id is required" },
      });
    }

    if (!authUserId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    const validation = UpdateBookClubSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: { message: getFirstValidationMessage(validation.error) },
      });
    }

    const payload: UpdateBookClubSchemaType = validation.data;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        error: { message: "At least one field must be provided to update" },
      });
    }

    const authMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: authUserId, clubId } },
      select: { role: true },
    });

    if (!authMembership || authMembership.role !== "OWNER") {
      return res.status(403).json({
        error: { message: "Only club owners can update club settings" },
      });
    }

    const updatedClub = await prisma.bookClub.update({
      where: { id: clubId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description }
          : {}),
        ...(payload.isPublic !== undefined ? { isPublic: payload.isPublic } : {}),
        ...(payload.genre !== undefined ? { genre: payload.genre } : {}),
        ...(payload.coverImage !== undefined
          ? { coverImage: payload.coverImage }
          : {}),
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    const data: GetClubByIdSuccessData = {
      club: {
        id: updatedClub.id,
        name: updatedClub.name,
        description: updatedClub.description,
        isPublic: updatedClub.isPublic,
        genre: updatedClub.genre,
        coverImage: updatedClub.coverImage,
        memberCount: updatedClub._count.members,
        isMember: true,
        memberRole: "OWNER",
        hasPendingJoinRequest: false,
        pendingJoinRequestId: null,
        createdAt: updatedClub.createdAt,
      },
    };

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        error: { message: "Club not found" },
      });
    }

    console.error("PATCH /api/clubs/:id failed:", error);
    return res.status(500).json({
      error: { message: "Failed to update club" },
    });
  }
};

export const deleteClub: RequestHandler = async (req, res) => {
  try {
    const rawClubId = req.params.id;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    const authUserId = res.locals.userId as string | undefined;

    if (!clubId) {
      return res.status(400).json({
        error: { message: "Club id is required" },
      });
    }

    if (!authUserId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    const authMembership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: authUserId, clubId } },
      select: { role: true },
    });

    if (!authMembership || authMembership.role !== "OWNER") {
      return res.status(403).json({
        error: { message: "Only club owners can delete the club" },
      });
    }

    await prisma.bookClub.delete({
      where: { id: clubId },
    });

    return res.status(200).json({
      status: "success",
      data: { message: "Club deleted successfully" },
    });
  } catch (error) {
    console.error("DELETE /api/clubs/:id failed:", error);
    return res.status(500).json({
      error: { message: "Failed to delete club" },
    });
  }
};
