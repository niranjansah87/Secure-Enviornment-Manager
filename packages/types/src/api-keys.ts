export interface ApiKeyDto {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  org_id: string;
  user_id: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  revoked: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expires_at?: string;
  user_id?: string;
}

export interface CreateApiKeyResponse extends ApiKeyDto {
  raw_key: string; // shown exactly once
}

export const API_KEY_SCOPES = [
  'secrets:read',
  'secrets:write',
  'secrets:export',
  'history:read',
  'history:rollback',
  'audit:read',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
