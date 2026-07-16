import express from "express";

import {
  createBookController,
  deleteBookController,
  getBook,
  listBooks,
  updateBookController,
} from "../controllers/bookController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/", listBooks);
router.get("/:id", getBook);
router.post("/", requireAuth, createBookController);
router.patch("/:id", requireAuth, updateBookController);
router.delete("/:id", requireAuth, deleteBookController);

export default router;
