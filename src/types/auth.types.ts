import { Role } from "./user.types";

export interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  username: string;
  role: Role;
}

export interface AuthSuccessData {
  user: AuthUserResponse;
  token: string;
}
