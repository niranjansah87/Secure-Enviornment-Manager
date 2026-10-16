import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  host: process.env['HOST'] ?? '0.0.0.0',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    poolMin: parseInt(process.env['DB_POOL_MIN'] ?? '2', 10),
    poolMax: parseInt(process.env['DB_POOL_MAX'] ?? '10', 10),
  },

  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    password: process.env['REDIS_PASSWORD'],
  },

  jwt: {
    // ES256 key pair — load from files in production
    privateKeyFile: process.env['JWT_PRIVATE_KEY_FILE'],
    publicKeyFile: process.env['JWT_PUBLIC_KEY_FILE'],
    privateKey: process.env['JWT_PRIVATE_KEY'],
    publicKey: process.env['JWT_PUBLIC_KEY'],
    accessTokenTtl: parseInt(process.env['JWT_ACCESS_TTL'] ?? '900', 10),    // 15 min
    refreshTokenTtl: parseInt(process.env['JWT_REFRESH_TTL'] ?? '2592000', 10), // 30 days
    issuer: process.env['JWT_ISSUER'] ?? 'sem-api',
    audience: process.env['JWT_AUDIENCE'] ?? 'sem-web',
  },

  masterKey: {
    value: process.env['SEM_MASTER_KEY'],
    file: process.env['SEM_MASTER_KEY_FILE'],
  },

  masterToken: process.env['SEM_MASTER_TOKEN'],

  // HMAC key for O(1) refresh token lookup (enables reuse detection on revoked sessions).
  // Must be 32+ bytes of entropy. Never log or expose.
  tokenHmacKey: process.env['SEM_TOKEN_HMAC_KEY'],

  cors: {
    origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
  },

  email: {
    host: process.env['SMTP_HOST'],
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    user: process.env['SMTP_USER'],
    pass: process.env['SMTP_PASS'],
    from: process.env['SMTP_FROM'] ?? 'noreply@sem.local',
  },

  rateLimits: {
    loginMaxAttempts: parseInt(process.env['RATE_LOGIN_MAX'] ?? '5', 10),
    loginWindowSeconds: parseInt(process.env['RATE_LOGIN_WINDOW'] ?? '900', 10),
  },

  swaggerEnabled: process.env['SWAGGER_ENABLED'] === 'true',
  logLevel: process.env['LOG_LEVEL'] ?? 'info',
}));
