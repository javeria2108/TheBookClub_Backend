import {
  CLUB_COVER_ALLOWED_MIME_TYPES,
  CLUB_COVER_MAX_BYTES,
} from "../config/upload";
import { createMemoryImageUpload } from "./createMemoryImageUpload";

export const uploadClubCover = createMemoryImageUpload({
  fieldName: "coverImage",
  maxBytes: CLUB_COVER_MAX_BYTES,
  allowedMimeTypes: CLUB_COVER_ALLOWED_MIME_TYPES,
  invalidTypeMessage: "Cover image must be a JPEG, PNG, or WebP file",
});
