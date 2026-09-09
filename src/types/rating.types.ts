import type { UpdateRatingSchemaType } from "../schemas/rating.schema";

export type RatingSummary = {
  averageRating: number | null;
  ratingCount: number;
  myRating: number | null;
};

export type Rating = {
  id: string;
  rating: number;
  review: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateRatingInput = UpdateRatingSchemaType;
