/**
 * BookClub-related TypeScript types and interfaces
 */

export interface BookClub {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: Date;
}

export interface CreateBookClubInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateBookClubInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface BookClubResponse {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: Date;
}
