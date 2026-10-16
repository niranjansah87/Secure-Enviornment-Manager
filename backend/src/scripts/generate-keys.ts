/** Adds missing cryptographic settings to the ignored workspace .env file. */
import { generateEs256KeyPair, generateAesKey } from '@sem/crypto';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function run() {
  const envCandidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(__dirname, '../../../.env'),
  ];
  const defaultPath = envCandidates.find((p) => existsSync(p)) ?? resolve(process.cwd(), '.env');
  const envPath = resolve(process.cwd(), process.argv[2] ?? defaultPath);
  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const presentValues = new Map<string, string>();
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const val = match[2]?.trim().replace(/^['"](.*)['"]$/, '$1') ?? '';
      presentValues.set(match[1]!, val);
    }
  }

  const { privateKey, publicKey } = generateEs256KeyPair();
  const generated: Record<string, string> = {
    JWT_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
    JWT_PUBLIC_KEY: publicKey.replace(/\n/g, '\\n'),
    SEM_MASTER_KEY: generateAesKey().toString('base64'),
    SEM_TOKEN_HMAC_KEY: randomBytes(32).toString('base64'),
    SEM_MASTER_TOKEN: randomBytes(32).toString('base64url'),
  };

  let updatedContent = existing;
  let filledCount = 0;

  for (const [key, value] of Object.entries(generated)) {
    const currentVal = presentValues.get(key);
    if (!currentVal || currentVal.length === 0) {
      filledCount++;
      const keyRegex = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
      if (keyRegex.test(updatedContent)) {
        updatedContent = updatedContent.replace(keyRegex, `${key}="${value}"`);
      } else {
        const separator = updatedContent.length > 0 && !updatedContent.endsWith('\n') ? '\n' : '';
        updatedContent = `${updatedContent}${separator}${key}="${value}"\n`;
      }
    }
  }

  if (filledCount > 0) {
    writeFileSync(envPath, updatedContent, { mode: 0o600 });
  }
  console.log(`Environment ready: ${filledCount} missing setting(s) generated in ${envPath}`);
}

run();
