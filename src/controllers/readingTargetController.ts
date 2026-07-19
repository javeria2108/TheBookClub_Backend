import type { RequestHandler, Response } from "express";

import {
  CreateReadingTargetSchema,
  ReadingCycleIdParamSchema,
  ReadingTargetIdParamSchema,
  ReorderReadingTargetsSchema,
  UpdateReadingTargetSchema,
} from "../schemas";
import {
  createReadingTarget,
  deleteReadingTarget,
  listReadingTargets,
  ReadingTargetServiceError,
  reorderReadingTargets,
  updateReadingTarget,
} from "../services/readingTargetService";
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

function handleReadingTargetError(res: Response, error: unknown) {
  if (error instanceof ReadingTargetServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected reading target API error:", error);
  return sendError(
    res,
    500,
    "READING_TARGET_INVALID",
    "Unable to complete the reading plan request. Please try again.",
  );
}

export const listClubReadingTargets: RequestHandler = async (req, res) => {
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
    const targets = await listReadingTargets(
      userId,
      validation.data.clubId,
      validation.data.cycleId,
    );

    return res.status(200).json({
      status: "success",
      data: { targets },
    });
  } catch (error) {
    return handleReadingTargetError(res, error);
  }
};

export const createClubReadingTarget: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const paramsValidation = ReadingCycleIdParamSchema.safeParse(req.params);
  const bodyValidation = CreateReadingTargetSchema.safeParse(req.body);

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
      "READING_TARGET_INVALID",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const target = await createReadingTarget(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.cycleId,
      bodyValidation.data,
    );

    return res.status(201).json({
      status: "success",
      data: { target },
    });
  } catch (error) {
    return handleReadingTargetError(res, error);
  }
};

export const updateClubReadingTarget: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const paramsValidation = ReadingTargetIdParamSchema.safeParse(req.params);
  const bodyValidation = UpdateReadingTargetSchema.safeParse(req.body);

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
      "READING_TARGET_INVALID",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const target = await updateReadingTarget(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.cycleId,
      paramsValidation.data.targetId,
      bodyValidation.data,
    );

    return res.status(200).json({
      status: "success",
      data: { target },
    });
  } catch (error) {
    return handleReadingTargetError(res, error);
  }
};

export const deleteClubReadingTarget: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const validation = ReadingTargetIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    const targets = await deleteReadingTarget(
      userId,
      validation.data.clubId,
      validation.data.cycleId,
      validation.data.targetId,
    );

    return res.status(200).json({
      status: "success",
      data: { targets },
    });
  } catch (error) {
    return handleReadingTargetError(res, error);
  }
};

export const reorderClubReadingTargets: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const paramsValidation = ReadingCycleIdParamSchema.safeParse(req.params);
  const bodyValidation = ReorderReadingTargetsSchema.safeParse(req.body);

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
      "READING_TARGET_ORDER_INVALID",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const targets = await reorderReadingTargets(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.cycleId,
      bodyValidation.data,
    );

    return res.status(200).json({
      status: "success",
      data: { targets },
    });
  } catch (error) {
    return handleReadingTargetError(res, error);
  }
};
