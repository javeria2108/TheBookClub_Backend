import type { Book } from "./book.types";
import type { RatingSummary } from "./rating.types";
import type { ReadingCycle } from "./readingCycle.types";

export type OverviewUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type OverviewClub = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  genre: string | null;
  coverImage: string | null;
  memberCount: number;
  isMember: boolean;
  memberRole: "MEMBER" | "MODERATOR" | "OWNER" | null;
  hasPendingJoinRequest: boolean;
  createdAt: Date;
};

export type OverviewTopic = {
  id: string;
  title: string;
  prompt: string | null;
  postCount: number;
  isPinned: boolean;
  lastActivityAt: Date;
  readingContext: string | null;
  createdBy: OverviewUser;
};

export type OverviewActivity = {
  id: string;
  kind: "DISCUSSION_POST" | "READING_ENTRY";
  text: string;
  createdAt: Date;
  user: OverviewUser;
  topic: { id: string; title: string } | null;
};

export type OverviewBook = {
  cycleId: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate: Date;
  book: Book;
  ratingSummary: RatingSummary;
};

export type RecentMember = {
  joinedAt: Date;
  user: OverviewUser;
};

export type ClubOverview = {
  club: OverviewClub;
  currentReading: ReadingCycle | null;
  bookContext: {
    title: string;
    description: string | null;
    authors: string[];
    pageCount: number | null;
    publishedDate: string | null;
    previewUrl: string | null;
    infoUrl: string | null;
  } | null;
  hotTopic: OverviewTopic | null;
  recentActivity: OverviewActivity[];
  ratingSummary: RatingSummary;
  topBooks: OverviewBook[];
  recentMembers: RecentMember[];
};

export type HomepageHighlights = {
  popularClubs: Array<{
    club: OverviewClub;
    ratingSummary: RatingSummary;
    currentReading: ReadingCycle | null;
    hotTopic: OverviewTopic | null;
  }>;
  hotTopics: Array<OverviewTopic & { club: { id: string; name: string } }>;
  topBooks: Array<OverviewBook & { club: { id: string; name: string } }>;
};
