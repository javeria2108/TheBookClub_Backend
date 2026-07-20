import express from "express";
import {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notificationController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/", requireAuth, getNotifications);
router.get("/unread-count", requireAuth, getNotificationUnreadCount);
router.patch("/read-all", requireAuth, markAllNotificationsAsRead);
router.patch("/:notificationId/read", requireAuth, markNotificationAsRead);

export default router;
