import path from "path";
import { promises as fs } from "fs";

import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  getPublicBaseUrl,
  USER_AVATAR_UPLOAD_DIR,
} from "../config/upload";
import type { ApiErrorCode } from "../utils/apiResponse";
import type { UpdateUserProfileInput, UserProfile } from "../types/user.types";

type UserProfileRecord = NonNullable<
  Awaited<ReturnType<typeof findUserProfileById>>
>;

export class UserServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

const userProfileSelect = {
  id: true,
  email: true,
  username: true,
  avatarUrl: true,
  bio: true,
  favoriteGenres: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  clubMemberships: {
    orderBy: { joinedAt: "desc" },
    select: {
      role: true,
      joinedAt: true,
      club: {
        select: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          genre: true,
          coverImage: true,
          createdAt: true,
          _count: {
            select: { members: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

async function findUserProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userProfileSelect,
  });
}

function toUserProfile(user: UserProfileRecord): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    favoriteGenres: user.favoriteGenres,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    joinedClubs: user.clubMemberships.map((membership) => ({
      id: membership.club.id,
      name: membership.club.name,
      description: membership.club.description,
      isPublic: membership.club.isPublic,
      genre: membership.club.genre,
      coverImage: membership.club.coverImage,
      memberCount: membership.club._count.members,
      memberRole: membership.role,
      joinedAt: membership.joinedAt,
      createdAt: membership.club.createdAt,
    })),
  };
}

function normalizeFavoriteGenres(genres: string[] | undefined): string[] | undefined {
  if (!genres) return undefined;

  const uniqueGenres = new Map<string, string>();

  genres.forEach((genre) => {
    const normalizedGenre = genre.trim();

    if (!normalizedGenre) {
      return;
    }

    uniqueGenres.set(normalizedGenre.toLowerCase(), normalizedGenre);
  });

  return Array.from(uniqueGenres.values());
}

function normalizeProfileUpdate(input: UpdateUserProfileInput): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = {};

  if (input.username !== undefined) {
    data.username = input.username.trim();
  }

  if (input.bio !== undefined) {
    const bio = input.bio?.trim();
    data.bio = bio ? bio : null;
  }

  if (input.favoriteGenres !== undefined) {
    data.favoriteGenres = normalizeFavoriteGenres(input.favoriteGenres) ?? [];
  }

  return data;
}

async function ensureUsernameIsAvailable(userId: string, username: string) {
  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== userId) {
    throw new UserServiceError(
      "USERNAME_ALREADY_EXISTS",
      "That username is already taken.",
      409,
    );
  }
}

function getLocalAvatarPathFromUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;

  try {
    const publicBaseUrl = new URL(getPublicBaseUrl());
    const parsedUrl = new URL(avatarUrl);

    if (parsedUrl.origin !== publicBaseUrl.origin) {
      return null;
    }

    const avatarPathPrefix = "/uploads/avatars/";

    if (!parsedUrl.pathname.startsWith(avatarPathPrefix)) {
      return null;
    }

    const filename = path.basename(parsedUrl.pathname);
    return path.join(USER_AVATAR_UPLOAD_DIR, filename);
  } catch {
    return null;
  }
}

async function removeLocalAvatarFile(avatarUrl: string | null) {
  const localPath = getLocalAvatarPathFromUrl(avatarUrl);

  if (!localPath) {
    return;
  }

  try {
    await fs.unlink(localPath);
  } catch {
    // Old local avatar cleanup is best-effort. The profile update should still succeed.
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await findUserProfileById(userId);

  if (!user) {
    throw new UserServiceError("USER_NOT_FOUND", "User profile was not found.", 404);
  }

  return toUserProfile(user);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
): Promise<UserProfile> {
  const data = normalizeProfileUpdate(input);

  if (typeof data.username === "string") {
    await ensureUsernameIsAvailable(userId, data.username);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userProfileSelect,
    });

    return toUserProfile(user);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new UserServiceError("USER_NOT_FOUND", "User profile was not found.", 404);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new UserServiceError(
        "USERNAME_ALREADY_EXISTS",
        "That username is already taken.",
        409,
      );
    }

    throw new UserServiceError(
      "PROFILE_UPDATE_FAILED",
      "Unable to update your profile. Please try again.",
      500,
    );
  }
}

export async function updateUserAvatar(
  userId: string,
  avatarUrl: string,
): Promise<UserProfile> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (!currentUser) {
    throw new UserServiceError("USER_NOT_FOUND", "User profile was not found.", 404);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: userProfileSelect,
  });

  await removeLocalAvatarFile(currentUser.avatarUrl);

  return toUserProfile(user);
}
