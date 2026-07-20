import { z } from "zod";

const CursorDateSchema = z
  .string()
  .datetime()
  .optional();

const BooleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const ListNotificationsQuerySchema = z.object({
  cursor: CursorDateSchema,
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: BooleanQuerySchema,
});

export const NotificationIdParamSchema = z.object({
  notificationId: z.string().uuid(),
});
