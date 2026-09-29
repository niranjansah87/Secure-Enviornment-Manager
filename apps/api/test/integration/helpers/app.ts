/**
 * Test app bootstrap — starts real Postgres 16 + Redis 7 containers,
 * runs migrations, boots the full NestJS app, returns supertest client.
 */
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { GenericContainer } from 'testcontainers';
import supertest from 'supertest';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { generateEs256KeyPair } from '@sem/crypto';
import { AppModule } from '../../../src/app.module';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import * as schema from '../../../src/infra/database/schema';

export interface TestContext {
  app: NestFastifyApplication;
  agent: ReturnType<typeof supertest>;
  db: NodePgDatabase<typeof schema>;
  pgUrl: string;
  jwtPrivateKey: string;
  jwtPublicKey: string;
  stop: () => Promise<void>;
}

const MIGRATIONS_DIR = join(
  __dirname,
  '../../../src/infra/database/migrations',
);

async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await pool.query(readFileSync(join(MIGRATIONS_DIR, '0001_initial_schema.sql'), 'utf8'));
    await pool.query(readFileSync(join(MIGRATIONS_DIR, '0002_add_token_lookup_hmac.sql'), 'utf8'));
  } finally {
    await pool.end();
  }
}

export async function createTestContext(): Promise<TestContext> {
  const [pgContainer, redisContainer] = await Promise.all([
    new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_DB: 'sem_test', POSTGRES_USER: 'sem', POSTGRES_PASSWORD: 'test' })
      .withExposedPorts(5432)
      .start(),
    new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start(),
  ]);

  const pgUrl = `postgresql://sem:test@${pgContainer.getHost()}:${pgContainer.getMappedPort(5432)}/sem_test`;
  const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

  await runMigrations(pgUrl);

  const { privateKey, publicKey } = generateEs256KeyPair();
  const masterKey = crypto.randomBytes(32).toString('base64');
  const tokenHmacKey = crypto.randomBytes(32).toString('base64');

  // Set env vars before ConfigModule reads them
  process.env['DATABASE_URL'] = pgUrl;
  process.env['REDIS_URL'] = redisUrl;
  process.env['JWT_PRIVATE_KEY'] = privateKey;
  process.env['JWT_PUBLIC_KEY'] = publicKey;
  process.env['SEM_MASTER_KEY'] = masterKey;
  process.env['SEM_TOKEN_HMAC_KEY'] = tokenHmacKey;
  process.env['NODE_ENV'] = 'test';
  process.env['LOG_LEVEL'] = 'silent';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logger: false }),
  );

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const pool = new Pool({ connectionString: pgUrl });
  const db = drizzle(pool, { schema });

  return {
    app,
    agent: supertest(app.getHttpServer()),
    db,
    pgUrl,
    jwtPrivateKey: privateKey,
    jwtPublicKey: publicKey,
    stop: async () => {
      await pool.end();
      await app.close();
      await pgContainer.stop();
      await redisContainer.stop();
    },
  };
}

/** Seed helpers */

export async function seedOrg(db: NodePgDatabase<typeof schema>, slug: string) {
  const [org] = await db
    .insert(schema.organizations)
    .values({ slug, name: slug })
    .returning();
  return org!;
}

export async function seedUser(
  db: NodePgDatabase<typeof schema>,
  orgId: string,
  username: string,
  opts: { role?: string; scopes?: string[]; password?: string } = {},
) {
  const password = opts.password ?? 'TestPassword123!';
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
  const [user] = await db
    .insert(schema.users)
    .values({
      orgId,
      username,
      passwordHash,
      role: opts.role ?? 'developer',
      scopes: opts.scopes ?? ['secrets:read', 'secrets:write'],
    })
    .returning();
  return { user: user!, password };
}
