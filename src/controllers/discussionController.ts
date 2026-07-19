import type { RequestHandler, Response } from "express";

import {
  CreateDiscussionPostSchema,
  CreateDiscussionTopicSchema,
  DiscussionPostIdParamSchema,
  DiscussionTopicIdParamSchema,
  ListDiscussionPostsQuerySchema,
  ListDiscussionTopicsQuerySchema,
  UpdateDiscussionPostSchema,
  UpdateDiscussionTopicSchema,
} from "../schemas";
import {
  createDiscussionPost,
  createDiscussionTopic,
  deleteDiscussionPost,
  deleteDiscussionTopic,
  DiscussionServiceError,
  getDiscussionTopic,
  listDiscussionPosts,
  listDiscussionTopics,
  updateDiscussionPost,
  updateDiscussionTopic,
} from "../services/discussionService";
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

function handleDiscussionError(res: Response, error: unknown) {
  if (error instanceof DiscussionServiceError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  console.error("Unexpected discussion API error:", error);
  return sendError(
    res,
    500,
    "DISCUSSION_TOPIC_INVALID",
    "Unable to complete the discussion request. Please try again.",
  );
}

export const listClubDiscussionTopics: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = DiscussionTopicIdParamSchema.pick({
    clubId: true,
  }).safeParse(req.params);
  const queryValidation = ListDiscussionTopicsQuerySchema.safeParse(req.query);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!queryValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(queryValidation.error));
  }

  try {
    const result = await listDiscussionTopics(
      userId,
      paramsValidation.data.clubId,
      queryValidation.data,
    );
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const createClubDiscussionTopic: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = DiscussionTopicIdParamSchema.pick({
    clubId: true,
  }).safeParse(req.params);
  const bodyValidation = CreateDiscussionTopicSchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "DISCUSSION_TOPIC_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const topic = await createDiscussionTopic(
      userId,
      paramsValidation.data.clubId,
      bodyValidation.data,
    );
    return res.status(201).json({ status: "success", data: { topic } });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const getClubDiscussionTopic: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const validation = DiscussionTopicIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
  }

  try {
    const topic = await getDiscussionTopic(
      userId,
      validation.data.clubId,
      validation.data.topicId,
    );
    return res.status(200).json({ status: "success", data: { topic } });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const updateClubDiscussionTopic: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = DiscussionTopicIdParamSchema.safeParse(req.params);
  const bodyValidation = UpdateDiscussionTopicSchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "DISCUSSION_TOPIC_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const topic = await updateDiscussionTopic(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.topicId,
      bodyValidation.data,
    );
    return res.status(200).json({ status: "success", data: { topic } });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const deleteClubDiscussionTopic: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const validation = DiscussionTopicIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
  }

  try {
    await deleteDiscussionTopic(
      userId,
      validation.data.clubId,
      validation.data.topicId,
    );
    return res.status(200).json({ status: "success", data: { message: "Discussion topic removed." } });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const listClubDiscussionPosts: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = DiscussionTopicIdParamSchema.safeParse(req.params);
  const queryValidation = ListDiscussionPostsQuerySchema.safeParse(req.query);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!queryValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(queryValidation.error));
  }

  try {
    const result = await listDiscussionPosts(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.topicId,
      queryValidation.data,
    );
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const createClubDiscussionPost: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = DiscussionTopicIdParamSchema.safeParse(req.params);
  const bodyValidation = CreateDiscussionPostSchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "DISCUSSION_POST_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const post = await createDiscussionPost(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.topicId,
      bodyValidation.data,
    );
    return res.status(201).json({ status: "success", data: { post } });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const updateClubDiscussionPost: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const paramsValidation = DiscussionPostIdParamSchema.safeParse(req.params);
  const bodyValidation = UpdateDiscussionPostSchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(paramsValidation.error));
  }
  if (!bodyValidation.success) {
    return sendError(res, 400, "DISCUSSION_POST_INVALID", getFirstValidationMessage(bodyValidation.error));
  }

  try {
    const post = await updateDiscussionPost(
      userId,
      paramsValidation.data.clubId,
      paramsValidation.data.postId,
      bodyValidation.data,
    );
    return res.status(200).json({ status: "success", data: { post } });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};

export const deleteClubDiscussionPost: RequestHandler = async (req, res) => {
  const userId = getAuthenticatedUserId(res);
  if (!userId) return sendAuthRequired(res);

  const validation = DiscussionPostIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendError(res, 400, "VALIDATION_ERROR", getFirstValidationMessage(validation.error));
  }

  try {
    await deleteDiscussionPost(
      userId,
      validation.data.clubId,
      validation.data.postId,
    );
    return res.status(200).json({ status: "success", data: { message: "Discussion reply removed." } });
  } catch (error) {
    return handleDiscussionError(res, error);
  }
};
