import type { RequestHandler, Response } from "express";

import {
  BookNominationIdParamSchema,
  BookVoteRoundIdParamSchema,
  BookVoteSchema,
  CreateBookNominationSchema,
  CreateBookVoteRoundSchema,
  ResolveBookVoteWinnerSchema,
  UpdateBookVoteRoundSchema,
} from "../schemas";
import {
  BookVoteServiceError,
  cancelBookVoteRound,
  clearBookVote,
  closeBookVoteRound,
  createBookNomination,
  createBookVoteRound,
  listBookVoteRounds,
  openBookVoteRound,
  removeBookNomination,
  resolveBookVoteWinner,
  updateBookVoteRound,
  voteForBookNomination,
} from "../services/bookVoteService";
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

function handleBookVoteError(res: Response, error: unknown) {
  if (error instanceof BookVoteServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected book vote API error:", error);
  return sendError(
    res,
    500,
    "BOOK_VOTE_INVALID",
    "Unable to complete the next-book request. Please try again.",
  );
}

const ClubOnlyParamSchema = BookVoteRoundIdParamSchema.pick({ clubId: true });

export const listClubBookVoteRounds: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const validation = ClubOnlyParamSchema.safeParse(req.params);
  if (!validation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
  }

  try {
    const voteRounds = await listBookVoteRounds(userId, validation.data.clubId);
    return res.status(200).json({ status: "success", data: { voteRounds } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};

export const createClubBookVoteRound: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = ClubOnlyParamSchema.safeParse(req.params);
  const bodyValidation = CreateBookVoteRoundSchema.safeParse(req.body);
  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "BOOK_VOTE_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const voteRound = await createBookVoteRound(
      userId,
      paramsValidation.data.clubId,
      bodyValidation.data,
    );
    return res.status(201).json({ status: "success", data: { voteRound } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};

export const updateClubBookVoteRound: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = BookVoteRoundIdParamSchema.safeParse(req.params);
  const bodyValidation = UpdateBookVoteRoundSchema.safeParse(req.body);
  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "BOOK_VOTE_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const voteRound = await updateBookVoteRound(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.roundId,
      bodyValidation.data,
    );
    return res.status(200).json({ status: "success", data: { voteRound } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};

function lifecycle(handler: typeof openBookVoteRound): RequestHandler {
  return async (req, res) => {
    const userId = getAuthenticatedUserId(res);
    if (!userId) return sendAuthRequired(res);

    const validation = BookVoteRoundIdParamSchema.safeParse(req.params);
    if (!validation.success) {
      return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
    }

    try {
      const voteRound = await handler(
        userId,
        validation.data.clubId,
        validation.data.roundId,
      );
      return res.status(200).json({ status: "success", data: { voteRound } });
    } catch (error) {
      return handleBookVoteError(res, error);
    }
  };
}

export const openClubBookVoteRound = lifecycle(openBookVoteRound);
export const closeClubBookVoteRound = lifecycle(closeBookVoteRound);
export const cancelClubBookVoteRound = lifecycle(cancelBookVoteRound);

export const createClubBookNomination: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = BookVoteRoundIdParamSchema.safeParse(req.params);
  const bodyValidation = CreateBookNominationSchema.safeParse(req.body);
  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "BOOK_VOTE_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const voteRound = await createBookNomination(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.roundId,
      bodyValidation.data,
    );
    return res.status(201).json({ status: "success", data: { voteRound } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};

export const deleteClubBookNomination: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const validation = BookNominationIdParamSchema.safeParse(req.params);
  if (!validation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
  }

  try {
    const voteRound = await removeBookNomination(
      userId,
      validation.data.clubId,
      validation.data.roundId,
      validation.data.nominationId,
    );
    return res.status(200).json({ status: "success", data: { voteRound } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};

export const voteInClubBookRound: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = BookVoteRoundIdParamSchema.safeParse(req.params);
  const bodyValidation = BookVoteSchema.safeParse(req.body);
  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "BOOK_VOTE_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const voteRound = await voteForBookNomination(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.roundId,
      bodyValidation.data,
    );
    return res.status(200).json({ status: "success", data: { voteRound } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};

export const clearClubBookVote: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const validation = BookVoteRoundIdParamSchema.safeParse(req.params);
  if (!validation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
  }

  try {
    const voteRound = await clearBookVote(
      userId,
      validation.data.clubId,
      validation.data.roundId,
    );
    return res.status(200).json({ status: "success", data: { voteRound } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};

export const resolveClubBookVoteWinner: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = BookVoteRoundIdParamSchema.safeParse(req.params);
  const bodyValidation = ResolveBookVoteWinnerSchema.safeParse(req.body);
  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "BOOK_VOTE_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const voteRound = await resolveBookVoteWinner(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.roundId,
      bodyValidation.data,
    );
    return res.status(200).json({ status: "success", data: { voteRound } });
  } catch (error) {
    return handleBookVoteError(res, error);
  }
};
