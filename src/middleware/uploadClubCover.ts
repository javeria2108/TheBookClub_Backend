import fs from "fs";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import {
  CLUB_COVER_ALLOWED_MIME_TYPES,
  CLUB_COVER_MAX_BYTES,
  CLUB_COVER_UPLOAD_DIR,
} from "../config/upload";

fs.mkdirSync(CLUB_COVER_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CLUB_COVER_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${randomUUID()}${extension}`);
  },
});

export const uploadClubCover = multer({
  storage,
  limits: { fileSize: CLUB_COVER_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!CLUB_COVER_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Cover image must be a JPEG, PNG, or WebP file"));
      return;
    }

    cb(null, true);
  },
}).single("coverImage");
