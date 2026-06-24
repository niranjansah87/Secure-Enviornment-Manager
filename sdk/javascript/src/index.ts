/**
 * SEM SDK - Main Client
 */

import type {
  SemConfig,
  StorageAdapter,
  AuthTokens,
  LoginCredentials,
  AuthResponse,
  SessionInfo,
  SecretsResponse,
  SecretCreateRequest,
  SecretUpdateRequest,
  BulkSecretsOperation,
  EnvironmentListResponse,
  AuditLogResponse,
  ApiKey,
  ApiKeyCreateRequest,
  ApiKeyResponse,
  WsEvent,
  SecretChangeEvent,
  SessionRevokedEvent,
  DeviceRevokedEvent,
  SemError,
  ErrorCode,
  ApiResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from './types';

const DEFAULT_TIMEOUT = 30000;
const TOKEN_REFRESH_THRESHOLD = 300; // 5 minutes before expiry

/**
 * Event emitter for SDK events
 */
class EventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on<T>(event: string, callback: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<T>(event: string, callback: (data: T) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  once<T>(event: string, callback: (data: T) => void): void {
    const wrapped = (data: T) => {
      callback(data);
      this.off(event, wrapped);
    };
    this.on(event, wrapped);
  }

  emit<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Local storage adapter for browser/Node.js
 */
class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'sem_sdk_';

  async get(key: string): Promise<string | null> {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage.getItem(this.prefix + key);
    }
    // Node.js fallback
    const envKey = this.prefix + key;
    try {
      const { readFileSync } = await import('fs');
      return readFileSync(envKey, 'utf-8');
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(this.prefix + key, value);
      return;
    }
    // Node.js fallback
    const envKey = this.prefix + key;
    try {
      const { writeFileSync } = await import('fs');
      writeFileSync(envKey, value);
    } catch {
      // Ignore
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.removeItem(this.prefix + key);
      return;
    }
    // Node.js fallback
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync(this.prefix + key);
    } catch {
      // Ignore
    }
  }
}

/**
 * Main SEM SDK Client
 */
export class SemSDK extends EventEmitter {
  private config: Required<SemConfig>;
  private storage: StorageAdapter;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private isRefreshing = false;
  private requestQueue: Array<(token: string) => void> = [];
  private wsConnection: WebSocket | null = null;
  private wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: SemConfig) {
    super();
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      wsUrl: config.wsUrl || `${config.baseUrl}/ws`,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      debug: config.debug || false,
      storage: config.storage || new LocalStorageAdapter(),
      autoRefresh: config.autoRefresh !== false,
    };
    this.storage = this.config.storage;
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Login with password credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.fetch<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: {
          namespace: credentials.namespace || 'global',
          environment: credentials.environment || 'main',
          password: credentials.password,
          deviceName: credentials.deviceName,
          deviceType: credentials.deviceType || 'sdk',
          platform: credentials.platform,
        },
      });

      if (response.success && response.data) {
        this.setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresAt: Date.now() + response.data.expiresIn * 1000,
        });
        await this.storage.set('accessToken', response.data.accessToken);
        await this.storage.set('refreshToken', response.data.refreshToken);
        this.emit('auth:login', response.data);
      }

      return response;
    } catch (error) {
      this.emit('auth:error', { error });
      throw this.normalizeError(error);
    }
  }

  /**
   * Logout and revoke tokens
   */
  async logout(): Promise<void> {
    try {
      await this.fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
      await this.storage.delete('accessToken');
      await this.storage.delete('refreshToken');
      this.disconnectWs();
      this.emit('auth:logout', {});
    }
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.requestQueue.push(() => resolve());
      }) as unknown as AuthResponse;
    }

    this.isRefreshing = true;

    try {
      const response = await this.fetch<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken: this.refreshToken },
      });

      if (response.success && response.data) {
        this.setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresAt: Date.now() + response.data.expiresIn * 1000,
        });
        await this.storage.set('accessToken', response.data.accessToken);
        await this.storage.set('refreshToken', response.data.refreshToken);
        this.emit('auth:refresh', response.data);
      }

      return response;
    } finally {
      this.isRefreshing = false;
      this.requestQueue.forEach(cb => cb(this.accessToken!));
      this.requestQueue = [];
    }
  }

  /**
   * Get current session info
   */
  async getSession(): Promise<SessionInfo> {
    const response = await this.fetch<ApiResponse<SessionInfo>>('/api/v1/auth/me');
    if (!response.success || !response.data) {
      throw new Error('Failed to get session');
    }
    return response.data;
  }

  /**
   * Get all active sessions
   */
  async getSessions(): Promise<SessionInfo[]> {
    const response = await this.fetch<ApiResponse<{ sessions: SessionInfo[] }>>(
      '/api/v1/auth/sessions'
    );
    return response.data?.sessions || [];
  }

  /**
   * Revoke a specific session (admin only)
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.fetch(`/api/v1/auth/admin/sessions/${sessionId}`, { method: 'DELETE' });
  }

  /**
   * Initialize from stored tokens
   */
  async initialize(): Promise<boolean> {
    const accessToken = await this.storage.get('accessToken');
    const refreshToken = await this.storage.get('refreshToken');

    if (accessToken && refreshToken) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      return true;
    }

    return false;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.refreshToken;
  }

  // ============================================================================
  // Secrets Management
  // ============================================================================

  /**
   * Get all secrets for a namespace/environment
   */
  async getSecrets(namespace: string, environment: string): Promise<SecretsResponse> {
    const response = await this.fetch<ApiResponse<SecretsResponse>>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}`
    );
    if (!response.success || !response.data) {
      throw new Error('Failed to get secrets');
    }
    return response.data;
  }

  /**
   * Get a specific secret
   */
  async getSecret(namespace: string, environment: string, key: string): Promise<string | null> {
    const response = await this.fetch<ApiResponse<{ value: string }>>(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/${encodeURIComponent(key)}`
    );
    return response.data?.value || null;
  }

  /**
   * Create a new secret
   */
  async createSecret(
    namespace: string,
    environment: string,
    request: SecretCreateRequest
  ): Promise<void> {
    await this.fetch(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/${encodeURIComponent(request.key)}`,
      { method: 'PUT', body: { value: request.value } }
    );
  }

  /**
   * Update an existing secret
   */
  async updateSecret(
    namespace: string,
    environment: string,
    key: string,
    request: SecretUpdateRequest
  ): Promise<void> {
    await this.fetch(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/${encodeURIComponent(key)}`,
      { method: 'PUT', body: { value: request.value } }
    );
  }

  /**
   * Delete a secret
   */
  async deleteSecret(namespace: string, environment: string, key: string): Promise<void> {
    await this.fetch(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/${encodeURIComponent(key)}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Bulk operation on secrets
   */
  async bulkSecrets(
    namespace: string,
    environment: string,
    operation: BulkSecretsOperation
  ): Promise<void> {
    await this.fetch(
      `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(environment)}/bulk`,
      { method: 'POST', body: operation }
    );
  }

  // ============================================================================
  // Environments
  // ============================================================================

  /**
   * List all environments
   */
  async getEnvironments(): Promise<EnvironmentListResponse> {
    const response = await this.fetch<ApiResponse<EnvironmentListResponse>>('/api/v1/environments');
    return response.data || { environments: [], total: 0 };
  }

  // ============================================================================
  // Audit Logs
  // ============================================================================

  /**
   * Get audit logs
   */
  async getAuditLogs(
    namespace?: string,
    environment?: string,
    page = 1,
    pageSize = 50
  ): Promise<AuditLogResponse> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (namespace) params.set('namespace', namespace);
    if (environment) params.set('environment', environment);

    const response = await this.fetch<ApiResponse<AuditLogResponse>>(
      `/api/v1/audit/logs?${params.toString()}`
    );
    return response.data || { entries: [], total: 0, page, pageSize };
  }

  // ============================================================================
  // API Keys
  // ============================================================================

  /**
   * List API keys
   */
  async getApiKeys(): Promise<ApiKey[]> {
    const response = await this.fetch<ApiResponse<{ keys: ApiKey[] }>>('/api/v1/auth/api-keys');
    return response.data?.keys || [];
  }

  /**
   * Create a new API key
   */
  async createApiKey(request: ApiKeyCreateRequest): Promise<ApiKeyResponse> {
    const response = await this.fetch<ApiResponse<ApiKeyResponse>>('/api/v1/auth/api-keys', {
      method: 'POST',
      body: request,
    });
    if (!response.success || !response.data) {
      throw new Error('Failed to create API key');
    }
    return response.data;
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await this.fetch(`/api/v1/auth/api-keys/${keyId}`, { method: 'DELETE' });
  }

  // ============================================================================
  // WebSocket
  // ============================================================================

  /**
   * Connect to WebSocket for realtime events
   */
  connectWs(): void {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${this.config.wsUrl}?token=${encodeURIComponent(this.accessToken)}`;
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onopen = () => {
      this.debug('WebSocket connected');
      this.emit('ws:connect', {});
      this.scheduleReconnect();
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent;
        this.handleWsEvent(data);
      } catch (error) {
        this.debug('WebSocket message parse error:', error);
      }
    };

    this.wsConnection.onclose = () => {
      this.debug('WebSocket disconnected');
      this.emit('ws:disconnect', {});
      this.scheduleReconnect();
    };

    this.wsConnection.onerror = (error) => {
      this.debug('WebSocket error:', error);
      this.emit('ws:error', { error });
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnectWs(): void {
    if (this.wsReconnectTimeout) {
      clearTimeout(this.wsReconnectTimeout);
      this.wsReconnectTimeout = null;
    }
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Subscribe to namespace/environment events
   */
  subscribeToEnvironment(namespace: string, environment: string): void {
    this.wsSend('subscribe', { namespace, environment });
  }

  /**
   * Unsubscribe from namespace/environment events
   */
  unsubscribeFromEnvironment(namespace: string, environment: string): void {
    this.wsSend('unsubscribe', { namespace, environment });
  }

  private wsSend(event: string, data: Record<string, unknown>): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({ event, data }));
    }
  }

  private handleWsEvent(event: WsEvent): void {
    this.emit('ws:event', event);

    switch (event.event) {
      case 'secret:created':
      case 'secret:updated':
      case 'secret:deleted':
      case 'secret:bulk_update':
        this.emit('secret:change', event.data as SecretChangeEvent);
        break;
      case 'session:revoked':
        this.emit('session:revoked', event.data as SessionRevokedEvent);
        break;
      case 'device:revoked':
        this.emit('device:revoked', event.data as DeviceRevokedEvent);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.wsReconnectTimeout) return;

    this.wsReconnectTimeout = setTimeout(() => {
      this.wsReconnectTimeout = null;
      if (this.accessToken) {
        this.connectWs();
      }
    }, 5000);
  }

  // ============================================================================
  // Request/Response Interceptors
  // ============================================================================

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  private async fetch<T>(
    path: string,
    options: { method?: string; body?: Record<string, unknown>; params?: Record<string, string> } = {}
  ): Promise<T> {
    let url = `${this.config.baseUrl}${path}`;

    // Apply request interceptors
    let requestConfig = {
      url,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: options.body,
    };

    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor.onRequest(requestConfig);
    }

    // Add auth header
    if (this.accessToken) {
      // Check if token needs refresh
      if (this.tokenExpiresAt && Date.now() > this.tokenExpiresAt - TOKEN_REFRESH_THRESHOLD * 1000) {
        await this.refresh();
      }
      requestConfig.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Build URL with params
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      method: requestConfig.method,
      headers: requestConfig.headers,
      body: requestConfig.body ? JSON.stringify(requestConfig.body) : undefined,
    });

    if (response.status === 401 && this.config.autoRefresh && this.refreshToken) {
      await this.refresh();
      return this.fetch(path, options);
    }

    const data = await response.json() as T;

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      return interceptor.onResponse(data);
    }

    return data;
  }

  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken || null;
    this.tokenExpiresAt = tokens.expiresAt || null;
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
  }

  private normalizeError(error: unknown): SemError {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        code: ErrorCode.SERVER_ERROR,
        statusCode: 500,
      };
    }
    return {
      name: 'Error',
      message: String(error),
      code: ErrorCode.SERVER_ERROR,
      statusCode: 500,
    };
  }

  private debug(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[SEM SDK]', ...args);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createSemSDK(config: SemConfig): SemSDK {
  return new SemSDK(config);
}

export { EventEmitter, LocalStorageAdapter };
export type { SemConfig, StorageAdapter, LoginCredentials, SessionInfo };