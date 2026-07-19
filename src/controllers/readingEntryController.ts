import type { RequestHandler, Response } from "express";

import {
  CreateReadingEntrySchema,
  ListReadingEntriesQuerySchema,
  ReadingCycleIdParamSchema,
  ReadingEntryIdParamSchema,
  UpdateReadingEntrySchema,
} from "../schemas";
import {
  createReadingEntry,
  deleteReadingEntry,
  listReadingEntries,
  ReadingEntryServiceError,
  updateReadingEntry,
} from "../services/readingEntryService";
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

function handleReadingEntryError(res: Response, error: unknown) {
  if (error instanceof ReadingEntryServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected reading entry API error:", error);
  return sendError(
    res,
    500,
    "READING_ENTRY_INVALID",
    "Unable to complete the reflections and quotes request. Please try again.",
  );
}

export const listClubReadingEntries: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = ReadingCycleIdParamSchema.safeParse(req.params);
  const queryValidation = ListReadingEntriesQuerySchema.safeParse(req.query);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!queryValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(queryValidation.error));
  }

  try {
    const result = await listReadingEntries(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.cycleId,
      queryValidation.data,
    );
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return handleReadingEntryError(res, error);
  }
};

export const createClubReadingEntry: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = ReadingCycleIdParamSchema.safeParse(req.params);
  const bodyValidation = CreateReadingEntrySchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "READING_ENTRY_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const entry = await createReadingEntry(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.cycleId,
      bodyValidation.data,
    );
    return res.status(201).json({ status: "success", data: { entry } });
  } catch (error) {
    return handleReadingEntryError(res, error);
  }
};

export const updateClubReadingEntry: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = ReadingEntryIdParamSchema.safeParse(req.params);
  const bodyValidation = UpdateReadingEntrySchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "READING_ENTRY_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const entry = await updateReadingEntry(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.entryId,
      bodyValidation.data,
    );
    return res.status(200).json({ status: "success", data: { entry } });
  } catch (error) {
    return handleReadingEntryError(res, error);
  }
};

export const deleteClubReadingEntry: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const validation = ReadingEntryIdParamSchema.safeParse(req.params);
  if (!validation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
  }

  try {
    await deleteReadingEntry(userId, validation.data.clubId, validation.data.entryId);
    return res.status(200).json({ status: "success", data: { message: "Reading entry removed." } });
  } catch (error) {
    return handleReadingEntryError(res, error);
  }
};
