/**
 * User-related TypeScript types inferred from Zod schemas.
 * The schemas remain the runtime source of truth.
 */

import type {
  AuthProviderSchemaType,
  CreateUserSchemaType,
  RoleSchemaType,
  UpdateUserSchemaType,
  UserLoginSchemaType,
  UserRegisterSchemaType,
  UserResponseSchemaType,
  UserSchemaType,
} from "../schemas";

export type Role = RoleSchemaType;
export type AuthProvider = AuthProviderSchemaType;

export type User = UserSchemaType;
export type CreateUserInput = CreateUserSchemaType;
export type UpdateUserInput = UpdateUserSchemaType;
export type UserLoginInput = UserLoginSchemaType;
export type UserRegisterInput = UserRegisterSchemaType;
export type UserResponse = UserResponseSchemaType;
