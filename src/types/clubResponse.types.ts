import { BookClubResponse } from "./bookClub.types";

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
