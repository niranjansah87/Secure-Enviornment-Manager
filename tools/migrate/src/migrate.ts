#!/usr/bin/env tsx
/**
 * SEM V1 → V2 migration tool.
 *
 * Usage:
 *   SEM_V1_ENCRYPTION_KEY=<fernet-key> DATABASE_URL=<v2-pg> SEM_MASTER_KEY=<v2-key> \
 *     tsx src/migrate.ts [--dry-run] [--org-name <name>] [--org-slug <slug>]
 *
 * What gets migrated:
 *   - Namespaces → Projects (one project per namespace)
 *   - Environments → Environments (per project)
 *   - Secrets → re-encrypted under V2 envelope (AES-256-GCM, fresh per-env DEK)
 *   - History → V2 audit_events (action=secret.import, metadata holds snapshot count)
 *   - Users → V2 users (password reset required — PBKDF2 hashes are NOT compatible)
 *
 * What does NOT migrate:
 *   - V1 API keys — fixed-salt PBKDF2 is cryptographically broken; all are invalidated.
 *     Users must create new API keys in V2 after logging in.
 *
 * Dry-run (default) prints a full migration plan without touching the DB.
 * Pass --execute to apply.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import * as argon2 from 'argon2';
import {
  generateAesKey,
  wrapKey,
  buildKeyAad,
  buildSecretAad,
  encryptValue,
} from '@sem/crypto';
import { fernetDecrypt } from './fernet.js';

// ─────────────────────────────────────────────────────────── helpers ──

function env(name: string, required = true): string {
  const v = process.env[name];
  if (!v && required) throw new Error(`Missing env var: ${name}`);
  return v ?? '';
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: !args.includes('--execute'),
    orgName: args[args.indexOf('--org-name') + 1] ?? 'Default Organization',
    orgSlug: args[args.indexOf('--org-slug') + 1] ?? 'default',
    dataDir: args[args.indexOf('--data-dir') + 1] ?? 'data',
  };
}

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// Randomly generated placeholder — user must change password after migration
async function randomArgon2Hash(): Promise<string> {
  const placeholder = randomUUID();
  return argon2.hash(placeholder, ARGON2_OPTS);
}

// ─────────────────────────────────────────────── V1 data readers ──────

interface V1User {
  user_id: string;
  username: string;
  email?: string;
  role: string;
  scopes: string[];
  must_change_password: boolean;
  status: string;
  created_at: string;
}

function loadV1Users(dataDir: string): V1User[] {
  const path = join(dataDir, 'users.json');
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, V1User>;
  return Object.values(raw);
}

interface V1Env {
  namespace: string;
  environment: string;
  filePath: string;
  historyPath: string | null;
}

function scanV1Environments(dataDir: string): V1Env[] {
  const envs: V1Env[] = [];
  if (!existsSync(dataDir)) return envs;

  for (const ns of readdirSync(dataDir)) {
    const nsPath = join(dataDir, ns);
    if (!statSync(nsPath).isDirectory()) continue;

    for (const file of readdirSync(nsPath)) {
      if (!file.endsWith('.enc')) continue;
      const envName = basename(file, '.enc');
      const histPath = join(nsPath, `${envName}.history.jsonl`);
      envs.push({
        namespace: ns,
        environment: envName,
        filePath: join(nsPath, file),
        historyPath: existsSync(histPath) ? histPath : null,
      });
    }
  }
  return envs;
}

function decryptV1Env(filePath: string, fernetKey: string): Record<string, string> {
  const encrypted = readFileSync(filePath);
  // Fernet token may be raw bytes (UTF-8 base64url string in file)
  const tokenStr = encrypted.toString('utf8').trim();
  const json = fernetDecrypt(fernetKey, tokenStr);
  return JSON.parse(json) as Record<string, string>;
}

interface V1HistoryEntry {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  description: string;
  variables: string; // Fernet-encrypted JSON
}

function loadV1History(historyPath: string, fernetKey: string): V1HistoryEntry[] {
  const lines = readFileSync(historyPath, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map((l) => {
    const entry = JSON.parse(l) as V1HistoryEntry;
    return entry;
  });
}

// ──────────────────────────────────────────── KMS helpers (no NestJS) ─

function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

interface EncryptedKeyRow {
  encryptedKey: Buffer;
  nonce: Buffer;
  tag: Buffer;
  aad: Buffer;
}

function createProjectKek(masterKey: Buffer, projectId: string): EncryptedKeyRow {
  const kek = generateAesKey();
  try {
    const aad = buildKeyAad({ scopeType: 'project', scopeId: projectId, keyVersion: 1 });
    const wrapped = wrapKey(kek, masterKey, aad);
    return { encryptedKey: wrapped.ciphertext, nonce: wrapped.nonce, tag: wrapped.tag, aad: wrapped.aad };
  } finally {
    kek.fill(0);
  }
}

function createEnvDek(kek: Buffer, environmentId: string): EncryptedKeyRow {
  const dek = generateAesKey();
  try {
    const aad = buildKeyAad({ scopeType: 'environment', scopeId: environmentId, keyVersion: 1 });
    const wrapped = wrapKey(dek, kek, aad);
    return { encryptedKey: wrapped.ciphertext, nonce: wrapped.nonce, tag: wrapped.tag, aad: wrapped.aad };
  } finally {
    dek.fill(0);
  }
}

function encryptSecret(
  plaintext: string,
  dek: Buffer,
  secretId: string,
  environmentId: string,
  key: string,
  version: number,
  dekVersion: number,
): { encryptedValue: Buffer; nonce: Buffer; tag: Buffer; aad: Buffer } {
  const aad = buildSecretAad({ secretId, environmentId, key, version, dekVersion });
  const blob = encryptValue({ plaintext, key: dek, aad });
  return { encryptedValue: blob.ciphertext, nonce: blob.nonce, tag: blob.tag, aad: blob.aad };
}

// Unwrap DEK from stored encrypted row using project KEK
function unwrapDek(
  dekRow: EncryptedKeyRow,
  kekRow: EncryptedKeyRow,
  masterKey: Buffer,
): Buffer {
  const { unwrapKey } = require('@sem/crypto') as typeof import('@sem/crypto');
  const kek = unwrapKey({ ciphertext: kekRow.encryptedKey, nonce: kekRow.nonce, tag: kekRow.tag, aad: kekRow.aad }, masterKey);
  try {
    return unwrapKey({ ciphertext: dekRow.encryptedKey, nonce: dekRow.nonce, tag: dekRow.tag, aad: dekRow.aad }, kek);
  } finally {
    kek.fill(0);
  }
}

// ──────────────────────────────────────────────────────────── main ────

interface MigrationPlan {
  orgName: string;
  orgSlug: string;
  users: V1User[];
  envGroups: Map<string, V1Env[]>;
  totalSecrets: number;
  totalHistoryEntries: number;
  skippedEnvs: string[];
}

async function buildPlan(opts: ReturnType<typeof parseArgs>, fernetKey: string): Promise<MigrationPlan> {
  const users = loadV1Users(opts.dataDir);
  const envs = scanV1Environments(opts.dataDir);

  const envGroups = new Map<string, V1Env[]>();
  let totalSecrets = 0;
  let totalHistoryEntries = 0;
  const skippedEnvs: string[] = [];

  for (const env of envs) {
    // Verify decryptable
    let secrets: Record<string, string> = {};
    try {
      secrets = decryptV1Env(env.filePath, fernetKey);
    } catch (err) {
      skippedEnvs.push(`${env.namespace}/${env.environment}: ${(err as Error).message}`);
      continue;
    }

    if (!envGroups.has(env.namespace)) envGroups.set(env.namespace, []);
    envGroups.get(env.namespace)!.push(env);
    totalSecrets += Object.keys(secrets).length;

    if (env.historyPath) {
      try {
        const history = loadV1History(env.historyPath, fernetKey);
        totalHistoryEntries += history.length;
      } catch {
        // History migration is best-effort
      }
    }
  }

  return { orgName: opts.orgName, orgSlug: opts.orgSlug, users, envGroups, totalSecrets, totalHistoryEntries, skippedEnvs };
}

function printPlan(plan: MigrationPlan): void {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SEM V1 → V2 Migration Plan (DRY RUN)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Organization: "${plan.orgName}" (slug: ${plan.orgSlug})`);
  console.log(`Users:        ${plan.users.length} (all will require password reset)`);
  console.log(`Projects:     ${plan.envGroups.size}`);
  console.log(`Environments: ${Array.from(plan.envGroups.values()).flat().length}`);
  console.log(`Secrets:      ${plan.totalSecrets}`);
  console.log(`History:      ${plan.totalHistoryEntries} snapshots (as audit events)`);
  console.log(`API keys:     ALL INVALIDATED — fixed-salt PBKDF2 is not safe to migrate\n`);

  if (plan.skippedEnvs.length > 0) {
    console.log('⚠  Skipped (decryption failed):');
    plan.skippedEnvs.forEach((s) => console.log(`   - ${s}`));
    console.log('');
  }

  console.log('Projects and environments:');
  for (const [ns, envs] of plan.envGroups) {
    console.log(`  ${ns}/`);
    for (const e of envs) {
      let count = 0;
      try {
        count = Object.keys(decryptV1Env(e.filePath, '')).length; // already validated above
      } catch { /* skip */ }
      console.log(`    ${e.environment}  (${count} secrets${e.historyPath ? ', has history' : ''})`);
    }
  }

  console.log('\nUsers:');
  plan.users.forEach((u) => {
    console.log(`  ${u.username} (${u.role}) — must_change_password=true`);
    console.log(`    V1 scopes: [${u.scopes.join(', ')}] → V2: ['secrets:read', 'secrets:write']`);
  });

  console.log('\nTo execute: add --execute flag\n');
}

async function execute(plan: MigrationPlan, client: Client, masterKey: Buffer, fernetKey: string): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SEM V1 → V2 Migration — EXECUTING');
  console.log('═══════════════════════════════════════════════════════\n');

  await client.query('BEGIN');
  try {
    // 1. Create org
    const orgId = randomUUID();
    await client.query(
      `INSERT INTO organizations (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
      [orgId, plan.orgSlug, plan.orgName],
    );
    // Fetch actual org id (in case of conflict)
    const orgRow = await client.query(`SELECT id FROM organizations WHERE slug = $1`, [plan.orgSlug]);
    const actualOrgId = orgRow.rows[0]?.id as string;
    console.log(`✓ Organization: ${plan.orgName} (${actualOrgId})`);

    // 2. Migrate users (password reset required — PBKDF2 not compatible with Argon2id)
    const userIdMap = new Map<string, string>(); // v1 user_id → v2 uuid
    for (const u of plan.users) {
      const newId = randomUUID();
      const placeholder = await randomArgon2Hash();
      await client.query(
        `INSERT INTO users (id, org_id, username, email, password_hash, role, scopes, must_change_password, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,TRUE)
         ON CONFLICT (org_id, username) DO NOTHING`,
        [newId, actualOrgId, u.username, u.email ?? null, placeholder, u.role, ['secrets:read', 'secrets:write']],
      );
      userIdMap.set(u.user_id, newId);
      console.log(`✓ User: ${u.username} (must reset password)`);
    }

    // 3. Migrate projects + environments + secrets
    for (const [namespace, envList] of plan.envGroups) {
      const projectId = randomUUID();
      await client.query(
        `INSERT INTO projects (id, org_id, slug, name) VALUES ($1,$2,$3,$4)`,
        [projectId, actualOrgId, namespace, namespace],
      );

      // Create Project KEK
      const kekRow = createProjectKek(masterKey, projectId);
      const kekId = randomUUID();
      await client.query(
        `INSERT INTO encryption_keys (id, scope_type, scope_id, key_version, encrypted_key, nonce, tag, aad, is_active)
         VALUES ($1,'project',$2,1,$3,$4,$5,$6,TRUE)`,
        [kekId, projectId, kekRow.encryptedKey, kekRow.nonce, kekRow.tag, kekRow.aad],
      );

      console.log(`✓ Project: ${namespace}`);

      for (const envMeta of envList) {
        const environmentId = randomUUID();
        await client.query(
          `INSERT INTO environments (id, project_id, slug, name) VALUES ($1,$2,$3,$4)`,
          [environmentId, projectId, envMeta.environment, envMeta.environment],
        );

        // Decrypt project KEK, create env DEK
        const masterKeyLocal = masterKey;
        // Fetch kek row back (we just inserted it)
        const kekFetch = await client.query(
          `SELECT encrypted_key, nonce, tag, aad FROM encryption_keys WHERE id=$1`,
          [kekId],
        );
        const kekData: EncryptedKeyRow = {
          encryptedKey: kekFetch.rows[0].encrypted_key as Buffer,
          nonce: kekFetch.rows[0].nonce as Buffer,
          tag: kekFetch.rows[0].tag as Buffer,
          aad: kekFetch.rows[0].aad as Buffer,
        };
        const { unwrapKey } = await import('@sem/crypto');
        const kek = unwrapKey(
          { ciphertext: kekData.encryptedKey, nonce: kekData.nonce, tag: kekData.tag, aad: kekData.aad },
          masterKeyLocal,
        );
        let dek: Buffer;
        try {
          const dekRow = createEnvDek(kek, environmentId);
          const dekId = randomUUID();
          await client.query(
            `INSERT INTO encryption_keys (id, scope_type, scope_id, key_version, encrypted_key, nonce, tag, aad, is_active)
             VALUES ($1,'environment',$2,1,$3,$4,$5,$6,TRUE)`,
            [dekId, environmentId, dekRow.encryptedKey, dekRow.nonce, dekRow.tag, dekRow.aad],
          );

          // Fetch back dek
          const dekFetch = await client.query(
            `SELECT encrypted_key, nonce, tag, aad FROM encryption_keys WHERE id=$1`,
            [dekId],
          );
          const dekData: EncryptedKeyRow = {
            encryptedKey: dekFetch.rows[0].encrypted_key as Buffer,
            nonce: dekFetch.rows[0].nonce as Buffer,
            tag: dekFetch.rows[0].tag as Buffer,
            aad: dekFetch.rows[0].aad as Buffer,
          };
          dek = unwrapKey(
            { ciphertext: dekData.encryptedKey, nonce: dekData.nonce, tag: dekData.tag, aad: dekData.aad },
            kek,
          );

          // Migrate secrets
          let secrets: Record<string, string> = {};
          try {
            secrets = decryptV1Env(envMeta.filePath, fernetKey);
          } catch (err) {
            console.warn(`  ⚠ Skipping ${namespace}/${envMeta.environment}: ${(err as Error).message}`);
            continue;
          }

          let secretCount = 0;
          for (const [secretKey, secretValue] of Object.entries(secrets)) {
            const secretId = randomUUID();
            const dekVersion = 1;
            const enc = encryptSecret(secretValue, dek, secretId, environmentId, secretKey, 1, dekVersion);

            await client.query(
              `INSERT INTO secrets (id, environment_id, key, encrypted_value, nonce, tag, aad, dek_id, is_sensitive, version)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,1)`,
              [secretId, environmentId, secretKey, enc.encryptedValue, enc.nonce, enc.tag, enc.aad, dekId],
            );
            await client.query(
              `INSERT INTO secret_versions (id, secret_id, version, encrypted_value, nonce, tag, aad, dek_id, change_type)
               VALUES ($1,$2,1,$3,$4,$5,$6,$7,'create')`,
              [randomUUID(), secretId, enc.encryptedValue, enc.nonce, enc.tag, enc.aad, dekId],
            );
            secretCount++;
          }

          // Migrate history as audit events
          let historyCount = 0;
          if (envMeta.historyPath) {
            try {
              const history = loadV1History(envMeta.historyPath, fernetKey);
              for (const h of history) {
                const actorId = userIdMap.get(h.user_id) ?? null;
                await client.query(
                  `INSERT INTO audit_events (id, occurred_at, org_id, actor_id, actor_type, action, resource_type, resource_id, metadata)
                   VALUES ($1,$2,$3,$4,'user','secret.import','environment',$5,$6)`,
                  [
                    randomUUID(),
                    h.timestamp,
                    actualOrgId,
                    actorId,
                    environmentId,
                    JSON.stringify({
                      v1_snapshot_id: h.id,
                      action: h.action,
                      description: h.description,
                      migrated_from: 'v1',
                    }),
                  ],
                );
                historyCount++;
              }
            } catch (err) {
              console.warn(`  ⚠ History migration failed for ${namespace}/${envMeta.environment}: ${(err as Error).message}`);
            }
          }

          console.log(`  ✓ ${namespace}/${envMeta.environment}: ${secretCount} secrets, ${historyCount} history entries`);
        } finally {
          dek?.fill(0);
          kek.fill(0);
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n✓ Migration complete\n');
    console.log('⚠  Action required:');
    console.log('   1. All migrated users must reset their passwords (must_change_password=true)');
    console.log('   2. All V1 API keys are invalidated — users must create new keys in V2');
    console.log('   3. V1 application must be stopped before directing traffic to V2\n');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

// ─────────────────────────────────────────────────────── entry point ──

async function main() {
  const opts = parseArgs();
  const fernetKey = env('SEM_V1_ENCRYPTION_KEY');
  const masterKeyB64 = env('SEM_MASTER_KEY');
  const dbUrl = env('DATABASE_URL');
  const masterKey = base64ToBuffer(masterKeyB64);

  if (masterKey.byteLength !== 32) {
    throw new Error(`SEM_MASTER_KEY must decode to 32 bytes (got ${masterKey.byteLength})`);
  }

  const plan = await buildPlan(opts, fernetKey);

  if (opts.dryRun) {
    // Dry-run uses the already-decrypted plan data to print counts correctly
    const fernetKeyForPlan = fernetKey;
    printPlan(plan);
    // Verify each environment is actually decryptable
    let allOk = true;
    for (const [ns, envList] of plan.envGroups) {
      for (const e of envList) {
        try {
          const secrets = decryptV1Env(e.filePath, fernetKeyForPlan);
          console.log(`  ✓ ${ns}/${e.environment}: ${Object.keys(secrets).length} secrets decryptable`);
        } catch (err) {
          console.error(`  ✗ ${ns}/${e.environment}: ${(err as Error).message}`);
          allOk = false;
        }
      }
    }
    if (!allOk) {
      console.error('\nSome environments failed validation. Fix before running with --execute\n');
      process.exit(1);
    }
    return;
  }

  // Execute migration
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await execute(plan, client, masterKey, fernetKey);
  } finally {
    masterKey.fill(0);
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
