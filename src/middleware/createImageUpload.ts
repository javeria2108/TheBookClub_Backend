import fs from "fs";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

type CreateImageUploadOptions = {
  fieldName: string;
  uploadDir: string;
  maxBytes: number;
  allowedMimeTypes: Set<string>;
  invalidTypeMessage: string;
};

export function createImageUpload({
  fieldName,
  uploadDir,
  maxBytes,
  allowedMimeTypes,
  invalidTypeMessage,
}: CreateImageUploadOptions) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const extension =
        EXTENSION_BY_MIME_TYPE[file.mimetype] ||
        path.extname(file.originalname).toLowerCase() ||
        ".jpg";
      cb(null, `${randomUUID()}${extension}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        cb(new Error(invalidTypeMessage));
        return;
      }

      cb(null, true);
    },
  }).single(fieldName);
}
