"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadClubCover = void 0;
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const upload_1 = require("../config/upload");
fs_1.default.mkdirSync(upload_1.CLUB_COVER_UPLOAD_DIR, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, upload_1.CLUB_COVER_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const extension = path_1.default.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `${(0, crypto_1.randomUUID)()}${extension}`);
    },
});
exports.uploadClubCover = (0, multer_1.default)({
    storage,
    limits: { fileSize: upload_1.CLUB_COVER_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!upload_1.CLUB_COVER_ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(new Error("Cover image must be a JPEG, PNG, or WebP file"));
            return;
        }
        cb(null, true);
    },
}).single("coverImage");
