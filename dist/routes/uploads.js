"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadController_1 = require("../controllers/uploadController");
const uploadClubCover_1 = require("../middleware/uploadClubCover");
const requireAuth_1 = require("../middleware/requireAuth");
const router = express_1.default.Router();
router.post("/club-cover", requireAuth_1.requireAuth, (req, res, next) => {
    (0, uploadClubCover_1.uploadClubCover)(req, res, (error) => {
        if (error instanceof Error) {
            return res.status(400).json({
                error: { message: error.message },
            });
        }
        if (error) {
            return res.status(400).json({
                error: { message: "Failed to upload cover image" },
            });
        }
        return next();
    });
}, uploadController_1.uploadClubCoverImage);
exports.default = router;
