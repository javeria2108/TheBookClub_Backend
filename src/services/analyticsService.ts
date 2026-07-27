import { logger } from "../utils/logger";

type AnalyticsEventName =
  | "account_created"
  | "club_created"
  | "club_joined"
  | "join_request_created"
  | "reading_cycle_started"
  | "discussion_created"
  | "vote_submitted"
  | "reflection_shared"
  | "feedback_submitted";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
) {
  logger.info("analytics_event", {
    eventName,
    properties: Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined),
    ),
  });
}
