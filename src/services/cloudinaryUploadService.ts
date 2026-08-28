import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../config/cloudinary";

type UploadImageOptions = {
  buffer: Buffer;
  folder: string;
  publicIdPrefix?: string;
};

export function uploadImageToCloudinary({
  buffer,
  folder,
  publicIdPrefix,
}: UploadImageOptions): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicIdPrefix
          ? `${publicIdPrefix}-${Date.now()}`
          : undefined,
        resource_type: "image",
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload failed"));
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}
