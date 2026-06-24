# SEM SDK - JavaScript/TypeScript

Official SDK for Secure Environment Manager (SEM)

## Features

- **Full TypeScript Support** - Typed interfaces for all API models
- **JWT Authentication** - Login, logout, token refresh with automatic retry
- **API Key Management** - Create, list, revoke API keys
- **Secrets Management** - CRUD operations for secrets
- **WebSocket Support** - Real-time event subscriptions
- **Browser + Node.js** - Works in both environments
- **Request Interceptors** - Customize API requests
- **Automatic Token Refresh** - Handles expired tokens gracefully

## Installation

```bash
npm install @sem-org/sem-sdk
```

## Quick Start

```typescript
import { createSemSDK } from '@sem-org/sem-sdk';

// Initialize SDK
const sem = createSemSDK({
  baseUrl: 'https://your-sem-server.com',
  debug: true,
});

// Login
await sem.login({
  password: 'your-password',
  deviceName: 'My App',
  deviceType: 'sdk',
});

// Get secrets
const secrets = await sem.getSecrets('global', 'main');
console.log(secrets);

// Create a secret
await sem.createSecret('global', 'main', {
  key: 'DATABASE_URL',
  value: 'postgres://...',
});

// WebSocket for realtime updates
sem.connectWs();
sem.on('secret:change', (event) => {
  console.log('Secret changed:', event);
});
```

## API Reference

### Authentication

#### `sem.login(credentials)`
```typescript
await sem.login({
  namespace: 'global',      // optional, defaults to 'global'
  environment: 'main',     // optional, defaults to 'main'
  password: 'your-password',
  deviceName: 'My App',    // optional
  deviceType: 'sdk',      // optional: mobile, desktop, cli, sdk
  platform: 'nodejs',      // optional
});
```

#### `sem.logout()`
```typescript
await sem.logout();
```

#### `sem.refresh()`
```typescript
await sem.refresh();
```

#### `sem.getSession()`
```typescript
const session = await sem.getSession();
console.log(session.namespace, session.environment);
```

### Secrets

#### `sem.getSecrets(namespace, environment)`
```typescript
const response = await sem.getSecrets('global', 'main');
console.log(response.secrets);  // Record<string, string>
```

#### `sem.getSecret(namespace, environment, key)`
```typescript
const value = await sem.getSecret('global', 'main', 'API_KEY');
```

#### `sem.createSecret(namespace, environment, request)`
```typescript
await sem.createSecret('global', 'main', {
  key: 'NEW_SECRET',
  value: 'secret-value',
});
```

#### `sem.updateSecret(namespace, environment, key, request)`
```typescript
await sem.updateSecret('global', 'main', 'NEW_SECRET', {
  value: 'updated-value',
});
```

#### `sem.deleteSecret(namespace, environment, key)`
```typescript
await sem.deleteSecret('global', 'main', 'OLD_SECRET');
```

### Environments

#### `sem.getEnvironments()`
```typescript
const { environments } = await sem.getEnvironments();
environments.forEach(env => {
  console.log(env.namespace, env.environment);
});
```

### Audit Logs

#### `sem.getAuditLogs(namespace?, environment?, page?, pageSize?)`
```typescript
const { entries, total } = await sem.getAuditLogs('global', 'main', 1, 50);
entries.forEach(entry => {
  console.log(entry.timestamp, entry.action);
});
```

### API Keys

#### `sem.getApiKeys()`
```typescript
const keys = await sem.getApiKeys();
```

#### `sem.createApiKey(request)`
```typescript
const newKey = await sem.createApiKey({
  name: 'CI/CD Pipeline',
  expiresInDays: 90,
});
console.log(newKey.key);  // Only returned once!
```

#### `sem.revokeApiKey(keyId)`
```typescript
await sem.revokeApiKey('key_abc123');
```

### WebSocket

#### `sem.connectWs()`
```typescript
sem.connectWs();
```

#### `sem.disconnectWs()`
```typescript
sem.disconnectWs();
```

#### Event Listeners
```typescript
sem.on('secret:change', (event) => {
  console.log(event.action, event.key);
});

sem.on('session:revoked', (event) => {
  console.log('Session revoked:', event.sessionId);
});

sem.on('ws:connect', () => console.log('Connected'));
sem.on('ws:disconnect', () => console.log('Disconnected'));
```

## Configuration

```typescript
const sem = createSemSDK({
  baseUrl: 'https://your-sem-server.com',  // Required
  wsUrl: 'wss://your-sem-server.com/ws',    // Optional, defaults to baseUrl + /ws
  timeout: 30000,                          // Optional, default 30s
  debug: false,                             // Optional, enables console logging
  autoRefresh: true,                        // Optional, auto-refresh tokens
  storage: customStorageAdapter,            // Optional, for token persistence
});
```

## Custom Storage

```typescript
import { createSemSDK, type StorageAdapter } from '@sem-org/sem-sdk';

class SecureStorage implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    // Your secure storage implementation
    return safeStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await safeStorage.setItem(key, value);
  }

  async delete(key: string): Promise<void> {
    await safeStorage.deleteItem(key);
  }
}

const sem = createSemSDK({
  baseUrl: 'https://your-sem-server.com',
  storage: new SecureStorage(),
});
```

## Request Interceptors

```typescript
sem.addRequestInterceptor({
  onRequest(config) {
    config.headers['X-Custom-Header'] = 'value';
    return config;
  },
});
```

## Error Handling

```typescript
try {
  await sem.getSecrets('global', 'main');
} catch (error) {
  if (error.code === 'AUTH_UNAUTHORIZED') {
    // Handle unauthorized
  } else if (error.code === 'RESOURCE_NOT_FOUND') {
    // Handle not found
  }
}
```

## TypeScript

All types are exported from the SDK:

```typescript
import type {
  SemConfig,
  LoginCredentials,
  SessionInfo,
  SecretsResponse,
  AuditLogResponse,
  ApiKey,
  SecretChangeEvent,
} from '@sem-org/sem-sdk';
```

## Node.js Usage

```typescript
import { createSemSDK } from '@sem-org/sem-sdk';

const sem = createSemSDK({
  baseUrl: process.env.SEM_BACKEND_URL,
});

// Initialize from environment
await sem.login({
  password: process.env.SEM_PASSWORD,
  deviceName: 'Node.js SDK',
  deviceType: 'sdk',
  platform: 'nodejs',
});
```

## Building

```bash
npm run build
```

Output: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`

## License

MIT