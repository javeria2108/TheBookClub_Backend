import {
  USER_AVATAR_ALLOWED_MIME_TYPES,
  USER_AVATAR_MAX_BYTES,
} from "../config/upload";
import { createMemoryImageUpload } from "./createMemoryImageUpload";

export const uploadUserAvatar = createMemoryImageUpload({
  fieldName: "avatar",
  maxBytes: USER_AVATAR_MAX_BYTES,
  allowedMimeTypes: USER_AVATAR_ALLOWED_MIME_TYPES,
  invalidTypeMessage: "Avatar must be a JPEG, PNG, or WebP file",
});
