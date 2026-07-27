import express from "express";
import { z } from "zod";
import { mutationRateLimit } from "../middleware/rateLimit";
import { sendError } from "../utils/apiResponse";
import { getFirstValidationMessage } from "../utils/validation";
import { trackEvent } from "../services/analyticsService";
import { logger } from "../utils/logger";

const router = express.Router();

const FeedbackSchema = z.object({
  category: z.enum(["GENERAL", "BUG", "FEATURE", "SAFETY"]),
  message: z.string().trim().min(10).max(2000),
  contactEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
});

router.post("/", mutationRateLimit, (req, res) => {
  const validation = FeedbackSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "FEEDBACK_INVALID",
      getFirstValidationMessage(validation.error),
    );
  }

  const { category, message, contactEmail } = validation.data;

  logger.info("feedback_submitted", {
    category,
    messageLength: message.length,
    hasContactEmail: Boolean(contactEmail),
  });
  trackEvent("feedback_submitted", {
    category,
    hasContactEmail: Boolean(contactEmail),
  });

  return res.status(201).json({
    status: "success",
    data: {
      message: "Thanks for helping improve BookCircle.",
    },
  });
});

export default router;
