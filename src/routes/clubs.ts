import express from "express";
import { getClubs } from "../controllers/clubController";
import { get } from "node:http";

const router = express.Router();

router.get("/", getClubs);

export default router;
