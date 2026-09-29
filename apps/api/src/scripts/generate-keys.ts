/**
 * Key generation helper.
 * Usage: pnpm --filter @sem/api keys:generate
 * Outputs all required secrets for .env — never commit the output.
 */
import { generateEs256KeyPair, generateAesKey } from '@sem/crypto';
import { randomBytes } from 'crypto';

function run() {
  const { privateKey, publicKey } = generateEs256KeyPair();
  const masterKey = generateAesKey().toString('base64');
  const hmacKey = randomBytes(32).toString('base64');

  console.log('\n=== SEM V2 Generated Keys ===\n');
  console.log('# ES256 JWT keys');
  console.log(`JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
  console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`);
  console.log('\n# Envelope encryption master key (32 bytes, base64)');
  console.log(`SEM_MASTER_KEY="${masterKey}"`);
  console.log('\n# Refresh token HMAC key (32 bytes, base64)');
  console.log(`SEM_TOKEN_HMAC_KEY="${hmacKey}"`);
  console.log('\n⚠  Store these in a secret manager. Never commit them.\n');
}

run();
