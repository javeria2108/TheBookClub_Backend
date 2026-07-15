import path from "path";

export const CLUB_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const USER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const CLUB_COVER_ALLOWED_MIME_TYPES = IMAGE_ALLOWED_MIME_TYPES;
export const USER_AVATAR_ALLOWED_MIME_TYPES = IMAGE_ALLOWED_MIME_TYPES;

export const CLUB_COVER_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "clubs",
);

export const USER_AVATAR_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "avatars",
);

export function getPublicBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "http://localhost:5001";
}

export function buildClubCoverPublicUrl(filename: string): string {
  return `${getPublicBaseUrl()}/uploads/clubs/${filename}`;
}

export function buildUserAvatarPublicUrl(filename: string): string {
  return `${getPublicBaseUrl()}/uploads/avatars/${filename}`;
}
