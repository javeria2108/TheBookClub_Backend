import express from "express";
import { getHomepageStats } from "../controllers/homepageController";

const router = express.Router();

router.get("/stats", getHomepageStats);

export default router;
