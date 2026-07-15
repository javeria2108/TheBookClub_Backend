import express from "express";
import { getMyClubs } from "../controllers/clubController";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  uploadUserAvatarMiddleware,
} from "../controllers/userController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/me", requireAuth, getMyProfile);
router.patch("/me", requireAuth, updateMyProfile);
router.post(
  "/me/avatar",
  requireAuth,
  uploadUserAvatarMiddleware,
  uploadMyAvatar,
);

// Get clubs for the current authenticated user
router.get("/me/clubs", requireAuth, getMyClubs);

export default router;
