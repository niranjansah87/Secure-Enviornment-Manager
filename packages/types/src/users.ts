import type { UserRole } from './auth';

export interface UserDto {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  scopes: string[];
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  role?: UserRole;
  scopes?: string[];
}

export interface UpdateUserRequest {
  email?: string;
  role?: UserRole;
  scopes?: string[];
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface CreateUserResponse extends UserDto {
  temp_password: string;
  email_sent: boolean;
}
