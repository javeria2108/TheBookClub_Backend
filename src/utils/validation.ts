import type { ZodError } from "zod";

export function getFirstValidationMessage(
  error: ZodError,
  fallback = "Invalid request data",
): string {
  return error.issues[0]?.message ?? fallback;
}
