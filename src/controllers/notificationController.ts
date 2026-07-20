import type { RequestHandler } from "express";
import {
  ListNotificationsQuerySchema,
  NotificationIdParamSchema,
} from "../schemas/notification.schema";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationServiceError,
} from "../services/notificationService";
import { sendError } from "../utils/apiResponse";
import { getFirstValidationMessage } from "../utils/validation";

export const getNotifications: RequestHandler = async (req, res) => {
  const parsed = ListNotificationsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(parsed.error),
    );
  }

  try {
    const page = await listNotifications(res.locals.userId as string, parsed.data);
    return res.json({ status: "success", data: page });
  } catch {
    return sendError(
      res,
      500,
      "NOTIFICATION_LOAD_FAILED",
      "Unable to load notifications. Please try again.",
    );
  }
};

export const getNotificationUnreadCount: RequestHandler = async (req, res) => {
  try {
    const unreadCount = await getUnreadNotificationCount(
      res.locals.userId as string,
    );
    return res.json({ status: "success", data: { unreadCount } });
  } catch {
    return sendError(
      res,
      500,
      "NOTIFICATION_LOAD_FAILED",
      "Unable to load notification count. Please try again.",
    );
  }
};

export const markNotificationAsRead: RequestHandler = async (req, res) => {
  const parsed = NotificationIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(parsed.error),
    );
  }

  try {
    const notification = await markNotificationRead(
      res.locals.userId as string,
      parsed.data.notificationId,
    );
    return res.json({ status: "success", data: notification });
  } catch (error) {
    if (error instanceof NotificationServiceError) {
      return sendError(res, error.statusCode, error.code, error.message);
    }

    return sendError(
      res,
      500,
      "NOTIFICATION_UPDATE_FAILED",
      "Unable to update notification. Please try again.",
    );
  }
};

export const markAllNotificationsAsRead: RequestHandler = async (req, res) => {
  try {
    const result = await markAllNotificationsRead(res.locals.userId as string);
    return res.json({ status: "success", data: result });
  } catch {
    return sendError(
      res,
      500,
      "NOTIFICATION_UPDATE_FAILED",
      "Unable to update notifications. Please try again.",
    );
  }
};
