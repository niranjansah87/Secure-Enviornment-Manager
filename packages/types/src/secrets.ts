export interface SecretDto {
  id: string;
  key: string;
  value: string;        // plaintext, only present when explicitly fetched
  description: string | null;
  is_sensitive: boolean;
  version: number;
  environment_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SecretListItemDto {
  id: string;
  key: string;
  description: string | null;
  is_sensitive: boolean;
  version: number;
  updated_at: string;
}

export interface SecretVersionDto {
  id: string;
  secret_id: string;
  version: number;
  change_type: 'create' | 'update' | 'delete';
  changed_by: string | null;
  created_at: string;
}

export interface UpsertSecretRequest {
  key: string;
  value: string;
  description?: string;
  is_sensitive?: boolean;
}

export interface BulkReplaceRequest {
  secrets: { key: string; value: string; description?: string; is_sensitive?: boolean }[];
}

export interface RestoreVersionRequest {
  version: number;
}

export type ExportFormat = 'env' | 'json' | 'docker';

export interface ExportRequest {
  format: ExportFormat;
}

export interface CompareResult {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
}
