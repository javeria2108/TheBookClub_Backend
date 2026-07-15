import {
  USER_AVATAR_ALLOWED_MIME_TYPES,
  USER_AVATAR_MAX_BYTES,
  USER_AVATAR_UPLOAD_DIR,
} from "../config/upload";
import { createImageUpload } from "./createImageUpload";

export const uploadUserAvatar = createImageUpload({
  fieldName: "avatar",
  uploadDir: USER_AVATAR_UPLOAD_DIR,
  maxBytes: USER_AVATAR_MAX_BYTES,
  allowedMimeTypes: USER_AVATAR_ALLOWED_MIME_TYPES,
  invalidTypeMessage: "Avatar must be a JPEG, PNG, or WebP file",
});
