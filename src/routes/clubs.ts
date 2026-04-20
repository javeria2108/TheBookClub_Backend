import express from "express";
import { createClub, getClubs } from "../controllers/clubController";
import { get } from "node:http";

const router = express.Router();

router.get("/", getClubs);
router.post("/", createClub);

export default router;
