import multer from "multer";

type CreateMemoryImageUploadOptions = {
  fieldName: string;
  maxBytes: number;
  allowedMimeTypes: Set<string>;
  invalidTypeMessage: string;
};

export function createMemoryImageUpload({
  fieldName,
  maxBytes,
  allowedMimeTypes,
  invalidTypeMessage,
}: CreateMemoryImageUploadOptions) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        cb(new Error(invalidTypeMessage));
        return;
      }

      cb(null, true);
    },
  }).single(fieldName);
}
