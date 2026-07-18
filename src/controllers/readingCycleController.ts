import type { RequestHandler, Response } from "express";

import {
  ClubIdParamSchema,
  CreateReadingCycleSchema,
  ListReadingCyclesQuerySchema,
  ReadingCycleIdParamSchema,
  UpdateReadingCycleSchema,
} from "../schemas";
import {
  cancelReadingCycle,
  completeReadingCycle,
  createReadingCycle,
  getCurrentReadingCycle,
  getReadingCycleById,
  listReadingCycles,
  ReadingCycleServiceError,
  startReadingCycle,
  updateReadingCycle,
} from "../services/readingCycleService";
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

function handleReadingCycleError(res: Response, error: unknown) {
  if (error instanceof ReadingCycleServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected reading cycle API error:", error);
  return sendError(
    res,
    500,
    "READING_CYCLE_UPDATE_FAILED",
    "Unable to complete the reading cycle request. Please try again.",
  );
}

export const listClubReadingCycles: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const paramsValidation = ClubIdParamSchema.safeParse(req.params);
  const queryValidation = ListReadingCyclesQuerySchema.safeParse(req.query);

  if (!paramsValidation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(paramsValidation.error),
    );
  }

  if (!queryValidation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(queryValidation.error),
    );
  }

  try {
    const readingCycles = await listReadingCycles(
      userId,
      paramsValidation.data.clubId,
      queryValidation.data,
    );

    return res.status(200).json({
      status: "success",
      data: { readingCycles },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};

export const getCurrentClubReadingCycle: RequestHandler = async (req, res) => {
  const validation = ClubIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    const readingCycle = await getCurrentReadingCycle(validation.data.clubId);

    return res.status(200).json({
      status: "success",
      data: { readingCycle },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};

export const getClubReadingCycle: RequestHandler = async (req, res) => {
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
    const readingCycle = await getReadingCycleById(
      userId,
      validation.data.clubId,
      validation.data.cycleId,
    );

    return res.status(200).json({
      status: "success",
      data: { readingCycle },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};

export const createClubReadingCycle: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const paramsValidation = ClubIdParamSchema.safeParse(req.params);
  const bodyValidation = CreateReadingCycleSchema.safeParse(req.body);

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
      "VALIDATION_ERROR",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const readingCycle = await createReadingCycle(
      userId,
      paramsValidation.data.clubId,
      bodyValidation.data,
    );

    return res.status(201).json({
      status: "success",
      data: { readingCycle },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};

export const updateClubReadingCycle: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendAuthRequired(res);
  }

  const paramsValidation = ReadingCycleIdParamSchema.safeParse(req.params);
  const bodyValidation = UpdateReadingCycleSchema.safeParse(req.body);

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
      "VALIDATION_ERROR",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const readingCycle = await updateReadingCycle(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.cycleId,
      bodyValidation.data,
    );

    return res.status(200).json({
      status: "success",
      data: { readingCycle },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};

export const startClubReadingCycle: RequestHandler = async (req, res) => {
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
    const readingCycle = await startReadingCycle(
      userId,
      validation.data.clubId,
      validation.data.cycleId,
    );

    return res.status(200).json({
      status: "success",
      data: { readingCycle },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};

export const completeClubReadingCycle: RequestHandler = async (req, res) => {
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
    const readingCycle = await completeReadingCycle(
      userId,
      validation.data.clubId,
      validation.data.cycleId,
    );

    return res.status(200).json({
      status: "success",
      data: { readingCycle },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};

export const cancelClubReadingCycle: RequestHandler = async (req, res) => {
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
    const readingCycle = await cancelReadingCycle(
      userId,
      validation.data.clubId,
      validation.data.cycleId,
    );

    return res.status(200).json({
      status: "success",
      data: { readingCycle },
    });
  } catch (error) {
    return handleReadingCycleError(res, error);
  }
};
