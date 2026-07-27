import express from "express";

import {
  createBookController,
  deleteBookController,
  getBook,
  importBookController,
  listBooks,
  searchBooks,
  updateBookController,
} from "../controllers/bookController";
import { requireAuth } from "../middleware/requireAuth";
import { mutationRateLimit, searchRateLimit } from "../middleware/rateLimit";

const router = express.Router();

router.get("/", searchRateLimit, listBooks);
router.get("/search", searchRateLimit, searchBooks);
router.post("/import", requireAuth, searchRateLimit, importBookController);
router.get("/:id", getBook);
router.post("/", requireAuth, mutationRateLimit, createBookController);
router.patch("/:id", requireAuth, mutationRateLimit, updateBookController);
router.delete("/:id", requireAuth, mutationRateLimit, deleteBookController);

export default router;
