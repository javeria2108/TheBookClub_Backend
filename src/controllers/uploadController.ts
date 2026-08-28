import type { RequestHandler } from "express";
import { uploadImageToCloudinary } from "../services/cloudinaryUploadService";

export const uploadClubCoverImage: RequestHandler = async (req, res) => {
  const userId = res.locals.userId as string | undefined;

  if (!userId) {
    return res.status(401).json({
      error: { message: "Authentication required" },
    });
  }

  if (!req.file?.buffer) {
    return res.status(400).json({
      error: { message: "Cover image file is required" },
    });
  }

  try {
    const result = await uploadImageToCloudinary({
      buffer: req.file.buffer,
      folder: "bookcircle/club-covers",
      publicIdPrefix: `club-cover-${userId}`,
    });

    return res.status(201).json({
      status: "success",
      data: {
        url: result.secure_url,
      },
    });
  } catch (error) {
    console.error("Cloudinary club cover upload failed:", error);
    return res.status(500).json({
      error: { message: "Failed to upload cover image" },
    });
  }
};
