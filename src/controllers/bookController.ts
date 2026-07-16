import type { RequestHandler, Response } from "express";

import {
  BookIdParamSchema,
  CreateBookSchema,
  GetBooksQuerySchema,
  UpdateBookSchema,
} from "../schemas";
import {
  BookServiceError,
  createBook,
  deleteBook,
  getBookById,
  getBooks,
  updateBook,
} from "../services/bookService";
import { sendError } from "../utils/apiResponse";
import { getFirstValidationMessage } from "../utils/validation";

function getAuthenticatedUserId(res: Response): string | null {
  return (res.locals.userId as string | undefined) ?? null;
}

function handleBookServiceError(res: Response, error: unknown) {
  if (error instanceof BookServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected book API error:", error);
  return sendError(
    res,
    500,
    "BOOK_UPDATE_FAILED",
    "Unable to complete the book request. Please try again.",
  );
}

export const listBooks: RequestHandler = async (req, res) => {
  const validation = GetBooksQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    const result = await getBooks(validation.data);

    return res.status(200).json({
      status: "success",
      data: result.books,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleBookServiceError(res, error);
  }
};

export const getBook: RequestHandler = async (req, res) => {
  const validation = BookIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    const book = await getBookById(validation.data.id);

    return res.status(200).json({
      status: "success",
      data: { book },
    });
  } catch (error) {
    return handleBookServiceError(res, error);
  }
};

export const createBookController: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  const validation = CreateBookSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    const book = await createBook(userId, validation.data);

    return res.status(201).json({
      status: "success",
      data: { book },
    });
  } catch (error) {
    return handleBookServiceError(res, error);
  }
};

export const updateBookController: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  const paramsValidation = BookIdParamSchema.safeParse(req.params);

  if (!paramsValidation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(paramsValidation.error),
    );
  }

  const bodyValidation = UpdateBookSchema.safeParse(req.body);

  if (!bodyValidation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(bodyValidation.error),
    );
  }

  try {
    const book = await updateBook(
      userId,
      paramsValidation.data.id,
      bodyValidation.data,
    );

    return res.status(200).json({
      status: "success",
      data: { book },
    });
  } catch (error) {
    return handleBookServiceError(res, error);
  }
};

export const deleteBookController: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  const validation = BookIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  try {
    await deleteBook(userId, validation.data.id);

    return res.status(200).json({
      status: "success",
      data: { message: "Book deleted successfully." },
    });
  } catch (error) {
    return handleBookServiceError(res, error);
  }
};
