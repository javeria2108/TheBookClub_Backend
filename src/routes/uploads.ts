import express from "express";
import { uploadClubCoverImage } from "../controllers/uploadController";
import { uploadClubCover } from "../middleware/uploadClubCover";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.post(
  "/club-cover",
  requireAuth,
  (req, res, next) => {
    uploadClubCover(req, res, (error) => {
      if (error instanceof Error) {
        return res.status(400).json({
          error: { message: error.message },
        });
      }

      if (error) {
        return res.status(400).json({
          error: { message: "Failed to upload cover image" },
        });
      }

      return next();
    });
  },
  uploadClubCoverImage,
);

export default router;
