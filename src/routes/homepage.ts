import express from "express";
import {
  getHomepageHighlightCards,
  getHomepageStats,
} from "../controllers/homepageController";

const router = express.Router();

router.get("/stats", getHomepageStats);
router.get("/highlights", getHomepageHighlightCards);

export default router;
