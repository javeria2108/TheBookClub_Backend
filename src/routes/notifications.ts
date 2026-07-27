import express from "express";
import {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notificationController";
import { requireAuth } from "../middleware/requireAuth";
import { notificationRateLimit } from "../middleware/rateLimit";

const router = express.Router();

router.get("/", requireAuth, getNotifications);
router.get("/unread-count", requireAuth, getNotificationUnreadCount);
router.patch("/read-all", requireAuth, notificationRateLimit, markAllNotificationsAsRead);
router.patch("/:notificationId/read", requireAuth, notificationRateLimit, markNotificationAsRead);

export default router;
