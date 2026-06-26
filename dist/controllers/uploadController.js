"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadClubCoverImage = void 0;
const upload_1 = require("../config/upload");
const uploadClubCoverImage = (req, res) => {
    const userId = res.locals.userId;
    if (!userId) {
        return res.status(401).json({
            error: { message: "Authentication required" },
        });
    }
    if (!req.file) {
        return res.status(400).json({
            error: { message: "Cover image file is required" },
        });
    }
    return res.status(201).json({
        status: "success",
        data: {
            url: (0, upload_1.buildClubCoverPublicUrl)(req.file.filename),
        },
    });
};
exports.uploadClubCoverImage = uploadClubCoverImage;
