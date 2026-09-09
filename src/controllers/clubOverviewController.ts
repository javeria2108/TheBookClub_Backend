import type { RequestHandler } from "express";

import { ClubRatingRouteParamSchema } from "../schemas";
import {
  ClubOverviewServiceError,
  getClubOverview,
} from "../services/clubOverviewService";
import { sendError } from "../utils/apiResponse";
import { getOptionalUserIdFromRequest } from "../utils/optionalAuth";
import { getFirstValidationMessage } from "../utils/validation";

function handleClubOverviewError(res: Parameters<RequestHandler>[1], error: unknown) {
  if (error instanceof ClubOverviewServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected club overview API error:", error);
  return sendError(
    res,
    500,
    "CLUB_NOT_FOUND",
    "Unable to load club overview. Please try again.",
  );
}

export const getClubOverviewById: RequestHandler = async (req, res) => {
  const paramsValidation = ClubRatingRouteParamSchema.safeParse(req.params);

  if (!paramsValidation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(paramsValidation.error),
    );
  }

  try {
    const overview = await getClubOverview(
      paramsValidation.data.id,
      getOptionalUserIdFromRequest(req),
    );

    return res.status(200).json({
      status: "success",
      data: { overview },
    });
  } catch (error) {
    return handleClubOverviewError(res, error);
  }
};
