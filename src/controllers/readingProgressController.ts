import type { RequestHandler, Response } from "express";

import {
  ReadingCycleIdParamSchema,
  UpdateReadingProgressSchema,
} from "../schemas";
import {
  getReadingProgress,
  ReadingProgressServiceError,
  updateMyReadingProgress,
} from "../services/readingProgressService";
import { sendError } from "../utils/apiResponse";
import { getFirstValidationMessage } from "../utils/validation";

function getAuthenticatedUserId(res: Response): string | null {
  return (res.locals.userId as string | undefined) ?? null;
}

function sendAuthRequired(res: Response) {
  return sendError(
    res,
    401,
    "AUTH_REQUIRED",
    "You must be signed in to continue.",
  );
}

function handleReadingProgressError(res: Response, error: unknown) {
  if (error instanceof ReadingProgressServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected reading progress API error:", error);
  return sendError(
    res,
    500,
    "READING_PROGRESS_UPDATE_FAILED",
    "Unable to complete the reading progress request. Please try again.",
  );
}

export const getClubReadingProgress: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const validation = ReadingCycleIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    const progress = await getReadingProgress(
      userId,
      validation.data.clubId,
      validation.data.cycleId,
    );

    return res.status(200).json({
      status: "success",
      data: progress,
    });
  } catch (error) {
    return handleReadingProgressError(res, error);
  }
};

export const updateMyClubReadingProgress: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const paramsValidation = ReadingCycleIdParamSchema.safeParse(req.params);
  const bodyValidation = UpdateReadingProgressSchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(paramsValidation.error),
    );
  }

  if (!bodyValidation.success) {
    return sendError(
      res,
      400,
      "READING_PROGRESS_INVALID",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const progress = await updateMyReadingProgress(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.cycleId,
      bodyValidation.data,
    );

    return res.status(200).json({
      status: "success",
      data: progress,
    });
  } catch (error) {
    return handleReadingProgressError(res, error);
  }
};
