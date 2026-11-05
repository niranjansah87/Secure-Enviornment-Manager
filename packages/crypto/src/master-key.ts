/**
 * Master key provider abstraction.
 * Initial implementation: env var SEM_MASTER_KEY (base64-encoded 32-byte key).
 * Designed for future KMS/Vault integration.
 */
import { KEY_LEN } from './envelope';

export interface MasterKeyProvider {
  getMasterKey(): Promise<Buffer>;
}

/**
 * Env-var-based master key provider.
 * SEM_MASTER_KEY must be a base64-encoded 32-byte (256-bit) key.
 * Generate with: openssl rand -base64 32
 */
export class EnvMasterKeyProvider implements MasterKeyProvider {
  private readonly _key: Buffer;

  constructor(envVarName = 'SEM_MASTER_KEY') {
    const raw = process.env[envVarName];
    if (!raw) {
      throw new Error(
        `Master key not configured. Set ${envVarName} to a base64-encoded 32-byte key. ` +
          'Generate with: openssl rand -base64 32',
      );
    }
    const buf = Buffer.from(raw.trim(), 'base64');
    if (buf.length !== KEY_LEN) {
      throw new Error(
        `Master key must decode to exactly ${KEY_LEN} bytes, got ${buf.length}. ` +
          'Ensure SEM_MASTER_KEY is a base64-encoded 32-byte value.',
      );
    }
    this._key = buf;
  }

  async getMasterKey(): Promise<Buffer> {
    return Buffer.from(this._key); // return a copy — never expose the stored reference
  }
}
