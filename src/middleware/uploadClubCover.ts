import {
  CLUB_COVER_ALLOWED_MIME_TYPES,
  CLUB_COVER_MAX_BYTES,
  CLUB_COVER_UPLOAD_DIR,
} from "../config/upload";
import { createImageUpload } from "./createImageUpload";

export const uploadClubCover = createImageUpload({
  fieldName: "coverImage",
  uploadDir: CLUB_COVER_UPLOAD_DIR,
  maxBytes: CLUB_COVER_MAX_BYTES,
  allowedMimeTypes: CLUB_COVER_ALLOWED_MIME_TYPES,
  invalidTypeMessage: "Cover image must be a JPEG, PNG, or WebP file",
});
