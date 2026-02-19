/**
 * User-related TypeScript types and interfaces
 */

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash?: string | null;
  role: Role;
  isEmailVerified: boolean;
  isActive: boolean;
  provider: AuthProvider;
  providerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash?: string;
  role?: Role;
  provider?: AuthProvider;
  providerId?: string;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  passwordHash?: string;
  role?: Role;
  isEmailVerified?: boolean;
  isActive?: boolean;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface UserRegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  role: Role;
  isEmailVerified: boolean;
  isActive: boolean;
  provider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
}
