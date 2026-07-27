type LogContext = Record<string, unknown>;

function redactContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  return Object.fromEntries(
    Object.entries(context).filter(([key]) => {
      const normalized = key.toLowerCase();
      return (
        !normalized.includes("password") &&
        !normalized.includes("token") &&
        !normalized.includes("secret") &&
        !normalized.includes("cookie")
      );
    }),
  );
}

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context: redactContext(context) } : {}),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, error?: unknown, context?: LogContext) {
    write("error", message, {
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
            }
          : error,
    });
  },
};
