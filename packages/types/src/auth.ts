export type AuthMethod = 'user_password' | 'api_key' | 'master_token';
export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;       // user ID
  org: string;       // organization ID
  role: UserRole;
  scopes: string[];
  session_id: string;
  auth_method: AuthMethod;
  must_change_password: boolean;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export type UserRole = 'admin' | 'developer' | 'viewer';

export interface LoginRequest {
  username?: string;
  password?: string;
  api_key?: string;
  master_token?: string;
  device_name?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: AuthenticatedUser;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  org_id: string;
  scopes: string[];
  must_change_password: boolean;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface SessionDto {
  id: string;
  device_name: string | null;
  device_ip: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}
