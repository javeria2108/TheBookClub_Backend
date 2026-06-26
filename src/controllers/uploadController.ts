import type { RequestHandler } from "express";
import { buildClubCoverPublicUrl } from "../config/upload";

export const uploadClubCoverImage: RequestHandler = (req, res) => {
  const userId = res.locals.userId as string | undefined;

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
      url: buildClubCoverPublicUrl(req.file.filename),
    },
  });
};
