import express from "express";
import {
  createClub,
  getClubById,
  getClubs,
} from "../controllers/clubController";
import { get } from "node:http";

const router = express.Router();

router.get("/", getClubs);
router.post("/", createClub);
router.get("/:id", getClubById);

export default router;
