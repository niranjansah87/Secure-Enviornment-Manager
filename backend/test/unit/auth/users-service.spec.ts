import { describe, expect, it, vi } from 'vitest';
import { UsersService } from '../../../src/domains/users/users.service';
import * as schema from '../../../src/infra/database/schema';

describe('UsersService authorization changes', () => {
  it('revokes active sessions in the same transaction as a scope change', async () => {
    const existing = { id: 'user-1', orgId: 'org-1', role: 'developer', scopes: ['secrets:read'], isActive: true };
    const updated = { ...existing, scopes: ['secrets:read', 'secrets:write'] };
    let revokedSessions = 0;
    const tx = {
      update: (table: unknown) => ({
        set: () => ({
          where: () => table === schema.users
            ? { returning: async () => [updated] }
            : Promise.resolve(++revokedSessions),
        }),
      }),
    };
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [existing] }) }) }),
      transaction: async (run: (transaction: typeof tx) => Promise<unknown>) => run(tx),
    };
    const audit = { writeEvent: vi.fn().mockResolvedValue(undefined) };
    const service = new UsersService(db as never, { add: vi.fn() } as never, audit as never);

    await service.update('user-1', 'org-1', { scopes: updated.scopes }, 'admin-1');

    expect(revokedSessions).toBe(1);
    expect(audit.writeEvent).toHaveBeenCalledOnce();
  });
});
