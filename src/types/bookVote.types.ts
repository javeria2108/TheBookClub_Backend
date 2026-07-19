import type {
  BookVoteSchemaType,
  CreateBookNominationSchemaType,
  CreateBookVoteRoundSchemaType,
  ResolveBookVoteWinnerSchemaType,
  UpdateBookVoteRoundSchemaType,
} from "../schemas";
import type { Book } from "./book.types";

export type BookVoteRoundStatus = "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";

export type BookNominationDto = {
  id: string;
  book: Book;
  reason: string | null;
  nominatedBy: { id: string; displayName: string; avatarUrl: string | null };
  voteCount: number;
  isCurrentUserVote: boolean;
  isWinner: boolean;
  canRemove: boolean;
  createdAt: Date;
};

export type BookVoteRoundDto = {
  id: string;
  clubId: string;
  title: string;
  description: string | null;
  status: BookVoteRoundStatus;
  opensAt: Date | null;
  closesAt: Date | null;
  totalEligibleMembers: number;
  totalVotes: number;
  currentUserVoteNominationId: string | null;
  canNominate: boolean;
  canVote: boolean;
  canManage: boolean;
  nominations: BookNominationDto[];
  winner: BookNominationDto | null;
  tiedLeaderIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBookVoteRoundInput = CreateBookVoteRoundSchemaType;
export type UpdateBookVoteRoundInput = UpdateBookVoteRoundSchemaType;
export type CreateBookNominationInput = CreateBookNominationSchemaType;
export type BookVoteInput = BookVoteSchemaType;
export type ResolveBookVoteWinnerInput = ResolveBookVoteWinnerSchemaType;
