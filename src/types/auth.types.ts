import type { UserRegisterInput, UserLoginInput, UserResponse } from "./user.types";

export type RegisterRequestBody = UserRegisterInput;
export type LoginRequestBody = UserLoginInput;

export type AuthUserResponse = Pick<
  UserResponse,
  "id" | "email" | "username" | "role"
>;

export interface AuthSuccessData {
  user: AuthUserResponse;
  token: string;
}
