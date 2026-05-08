"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clubController_1 = require("../controllers/clubController");
const requireAuth_1 = require("../middleware/requireAuth");
const router = express_1.default.Router();
// Get clubs for the current authenticated user
router.get("/me/clubs", requireAuth_1.requireAuth, clubController_1.getMyClubs);
exports.default = router;
