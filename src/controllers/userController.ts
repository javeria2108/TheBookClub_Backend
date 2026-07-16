import type { RequestHandler, Response } from "express";
import { promises as fs } from "fs";
import multer from "multer";

import { buildUserAvatarPublicUrl } from "../config/upload";
import { uploadUserAvatar } from "../middleware/uploadUserAvatar";
import { UpdateUserProfileSchema } from "../schemas";
import {
  getUserProfile,
  updateUserAvatar,
  updateUserProfile,
  UserServiceError,
} from "../services/userService";
import { sendError } from "../utils/apiResponse";
import { getFirstValidationMessage } from "../utils/validation";

function getAuthenticatedUserId(res: Response): string | null {
  return (res.locals.userId as string | undefined) ?? null;
}

async function removeUploadedFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch {
    // Best-effort cleanup. Preserve the original upload/update error.
  }
}

export const getMyProfile: RequestHandler = async (_req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  try {
    const profile = await getUserProfile(userId);

    return res.status(200).json({
      status: "success",
      data: { profile },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return sendError(res, error.statusCode, error.code, error.message);
    }

    console.error("GET /api/users/me failed:", error);
    return sendError(
      res,
      500,
      "PROFILE_LOAD_FAILED",
      "Unable to load your profile. Please try again.",
    );
  }
};

export const updateMyProfile: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  const validation = UpdateUserProfileSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    const profile = await updateUserProfile(userId, validation.data);

    return res.status(200).json({
      status: "success",
      data: { profile },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return sendError(res, error.statusCode, error.code, error.message);
    }

    console.error("PATCH /api/users/me failed:", error);
    return sendError(
      res,
      500,
      "PROFILE_UPDATE_FAILED",
      "Unable to update your profile. Please try again.",
    );
  }
};

export const uploadMyAvatar: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  if (!req.file) {
    return sendError(res, 400, "VALIDATION_ERROR", "Avatar image file is required.");
  }

  const uploadedFile = req.file;

  try {
    const profile = await updateUserAvatar(
      userId,
      buildUserAvatarPublicUrl(uploadedFile.filename),
    );

    return res.status(200).json({
      status: "success",
      data: { profile },
    });
  } catch (error) {
    await removeUploadedFile(uploadedFile.path);

    if (error instanceof UserServiceError) {
      return sendError(res, error.statusCode, error.code, error.message);
    }

    console.error("POST /api/users/me/avatar failed:", error);
    return sendError(
      res,
      500,
      "PROFILE_UPDATE_FAILED",
      "Unable to update your avatar. Please try again.",
    );
  }
};

export const uploadUserAvatarMiddleware: RequestHandler = (req, res, next) => {
  uploadUserAvatar(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 400, "FILE_TOO_LARGE", "Avatar must be 2 MB or smaller.");
    }

    if (error instanceof Error) {
      return sendError(res, 400, "INVALID_FILE_TYPE", error.message);
    }

    if (error) {
      return sendError(res, 400, "PROFILE_UPDATE_FAILED", "Failed to upload avatar.");
    }

    return next();
  });
};
