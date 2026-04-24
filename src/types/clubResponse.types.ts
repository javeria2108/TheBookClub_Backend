import type { BookClubResponse } from "./bookClub.types";

export interface ClubsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetClubsSuccessData {
  clubs: BookClubResponse[];
  pagination: ClubsPagination;
}

export interface CreateClubSuccessData {
  club: BookClubResponse;
}

export interface GetClubByIdSuccessData {
  club: BookClubResponse;
}

export interface JoinClubSuccessData {
  clubId: string;
  memberCount: number;
}
