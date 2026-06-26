"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLUB_COVER_UPLOAD_DIR = exports.CLUB_COVER_ALLOWED_MIME_TYPES = exports.CLUB_COVER_MAX_BYTES = void 0;
exports.getPublicBaseUrl = getPublicBaseUrl;
exports.buildClubCoverPublicUrl = buildClubCoverPublicUrl;
const path_1 = __importDefault(require("path"));
exports.CLUB_COVER_MAX_BYTES = 5 * 1024 * 1024;
exports.CLUB_COVER_ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);
exports.CLUB_COVER_UPLOAD_DIR = path_1.default.join(process.cwd(), "uploads", "clubs");
function getPublicBaseUrl() {
    return process.env.PUBLIC_BASE_URL ?? "http://localhost:5001";
}
function buildClubCoverPublicUrl(filename) {
    return `${getPublicBaseUrl()}/uploads/clubs/${filename}`;
}
