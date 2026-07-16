/**
 * User-related TypeScript types inferred from Zod schemas.
 * The schemas remain the runtime source of truth.
 */

import type {
  AuthProviderSchemaType,
  ClubMemberRoleSchemaType,
  CreateUserSchemaType,
  JoinedClubProfileSummarySchemaType,
  RoleSchemaType,
  UpdateUserProfileSchemaType,
  UpdateUserSchemaType,
  UserLoginSchemaType,
  UserProfileSchemaType,
  UserRegisterSchemaType,
  UserResponseSchemaType,
  UserSchemaType,
} from "../schemas";

export type Role = RoleSchemaType;
export type AuthProvider = AuthProviderSchemaType;
export type ClubMemberRole = ClubMemberRoleSchemaType;

export type User = UserSchemaType;
export type CreateUserInput = CreateUserSchemaType;
export type UpdateUserInput = UpdateUserSchemaType;
export type UpdateUserProfileInput = UpdateUserProfileSchemaType;
export type UserLoginInput = UserLoginSchemaType;
export type UserRegisterInput = UserRegisterSchemaType;
export type UserResponse = UserResponseSchemaType;
export type JoinedClubProfileSummary = JoinedClubProfileSummarySchemaType;
export type UserProfile = UserProfileSchemaType;
