/**
 * Type definitions for SEM SDK
 */

// =============================================================================
// Core Types
// =============================================================================

export interface SemConfig {
  /** Base URL of the SEM backend */
  baseUrl: string;
  /** WebSocket URL for realtime events (defaults to baseUrl + /ws) */
  wsUrl?: string;
  /** API timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom storage adapter */
  storage?: StorageAdapter;
  /** Automatic token refresh */
  autoRefresh?: boolean;
}

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

// =============================================================================
// Auth Types
// =============================================================================

export interface LoginCredentials {
  /** Namespace (defaults to 'global') */
  namespace?: string;
  /** Environment (defaults to 'main') */
  environment?: string;
  /** Dashboard password */
  password: string;
  /** Device name for tracking */
  deviceName?: string;
  /** Device type: mobile, desktop, cli, sdk */
  deviceType?: 'mobile' | 'desktop' | 'cli' | 'sdk';
  /** Platform: ios, android, windows, macos, linux */
  platform?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    deviceId?: string;
  };
  error?: string;
}

export interface SessionInfo {
  sessionId: string;
  namespace: string;
  environment: string;
  isAdmin: boolean;
  devices?: DeviceInfo[];
  tokens?: TokenInfo[];
  expiresAt?: string;
  tokenType?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  createdAt: string;
  lastActive: string;
  isRevoked: boolean;
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenInfo {
  tokenId: string;
  tokenType: string;
  createdAt: string;
  expiresAt: string;
  lastUsed?: string;
}

// =============================================================================
// Secrets Types
// =============================================================================

export interface Secret {
  key: string;
  value?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  version?: number;
}

export interface SecretsResponse {
  namespace: string;
  environment: string;
  secrets: Record<string, string>;
  total: number;
  lastUpdated?: string;
}

export interface SecretCreateRequest {
  key: string;
  value: string;
}

export interface SecretUpdateRequest {
  value: string;
}

export interface BulkSecretsOperation {
  operation: 'upsert' | 'delete';
  secrets: Record<string, string>;
}

// =============================================================================
// Environments Types
// =============================================================================

export interface Environment {
  namespace: string;
  environment: string;
  lastUpdated?: string;
  secretCount?: number;
}

export interface EnvironmentListResponse {
  environments: Environment[];
  total: number;
}

// =============================================================================
// Audit Types
// =============================================================================

export interface AuditEntry {
  timestamp: string;
  action: string;
  namespace?: string;
  environment?: string;
  userId?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// =============================================================================
// API Keys Types
// =============================================================================

export interface ApiKey {
  keyId: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface ApiKeyCreateRequest {
  name: string;
  expiresInDays?: number;
}

export interface ApiKeyResponse {
  key: string;
  keyId: string;
  name: string;
  createdAt: string;
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

export interface WsEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export type SecretChangeAction = 'created' | 'updated' | 'deleted' | 'bulk_update';

export interface SecretChangeEvent {
  namespace: string;
  environment: string;
  action: SecretChangeAction;
  key?: string;
  count?: number;
}

export interface SessionRevokedEvent {
  sessionId: string;
}

export interface DeviceRevokedEvent {
  deviceId: string;
  sessionId: string;
}

// =============================================================================
// Error Types
// =============================================================================

export enum ErrorCode {
  UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  REFRESH_FAILED = 'AUTH_REFRESH_FAILED',
  VALIDATION_MISSING_FIELD = 'VALIDATION_MISSING_FIELD',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export interface SemError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// Pagination Types
// =============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// Request/Response Interceptors
// =============================================================================

export interface RequestInterceptor {
  onRequest(config: RequestConfig): Promise<RequestConfig> | RequestConfig;
}

export interface ResponseInterceptor {
  onResponse<T>(response: ApiResponse<T>): ApiResponse<T>;
  onError(error: SemError): never | SemError;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
}

// =============================================================================
// Event Emitter Types
// =============================================================================

export type EventCallback<T = unknown> = (data: T) => void;

export interface TypedEmitter {
  on<T>(event: string, callback: EventCallback<T>): void;
  off<T>(event: string, callback: EventCallback<T>): void;
  once<T>(event: string, callback: EventCallback<T>): void;
  removeAllListeners(event?: string): void;
}