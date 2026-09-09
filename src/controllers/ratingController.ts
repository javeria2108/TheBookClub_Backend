import type { RequestHandler, Response } from "express";

import {
  BookRatingParamSchema,
  ClubRatingRouteParamSchema,
  UpdateRatingSchema,
} from "../schemas";
import {
  RatingServiceError,
  upsertBookRating,
  upsertClubRating,
} from "../services/ratingService";
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

function handleRatingError(
  res: Response,
  error: unknown,
  fallbackCode: "CLUB_RATING_UPDATE_FAILED" | "BOOK_RATING_UPDATE_FAILED",
) {
  if (error instanceof RatingServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected rating API error:", error);
  return sendError(
    res,
    500,
    fallbackCode,
    "Unable to save your rating. Please try again.",
  );
}

export const updateMyClubRating: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = ClubRatingRouteParamSchema.safeParse(req.params);
  const bodyValidation = UpdateRatingSchema.safeParse(req.body);

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
      "CLUB_RATING_INVALID",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const result = await upsertClubRating(
      userId,
      paramsValidation.data.id,
      bodyValidation.data,
    );

    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return handleRatingError(res, error, "CLUB_RATING_UPDATE_FAILED");
  }
};

export const updateMyBookRating: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = BookRatingParamSchema.safeParse(req.params);
  const bodyValidation = UpdateRatingSchema.safeParse(req.body);

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
      "BOOK_RATING_INVALID",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const result = await upsertBookRating(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.bookId,
      bodyValidation.data,
    );

    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return handleRatingError(res, error, "BOOK_RATING_UPDATE_FAILED");
  }
};
