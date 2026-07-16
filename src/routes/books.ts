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

const router = express.Router();

router.get("/", listBooks);
router.get("/search", searchBooks);
router.post("/import", requireAuth, importBookController);
router.get("/:id", getBook);
router.post("/", requireAuth, createBookController);
router.patch("/:id", requireAuth, updateBookController);
router.delete("/:id", requireAuth, deleteBookController);

export default router;
