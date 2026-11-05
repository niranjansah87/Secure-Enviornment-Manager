import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, saveConfig, clearConfig, CliConfig } from './commands/config.js';
import { secretsRoutes } from './commands/secrets.js';
import { authRoutes } from './commands/auth.js';
import { envRoutes } from './commands/env.js';

describe('CLI Configuration & Commands', () => {
  const testConfig: CliConfig = {
    baseUrl: 'https://sem.example.com',
    wsUrl: 'wss://sem.example.com',
    namespace: 'test-org',
    environment: 'production',
    token: 'test-token-jwt',
    refreshToken: 'test-refresh-token',
  };

  it('registers expected secrets commands', () => {
    const commandNames = secretsRoutes.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('list');
    expect(commandNames).toContain('get');
    expect(commandNames).toContain('set');
    expect(commandNames).toContain('delete');
  });

  it('registers expected auth commands', () => {
    const commandNames = authRoutes.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('login');
    expect(commandNames).toContain('logout');
    expect(commandNames).toContain('status');
  });

  it('registers expected env commands', () => {
    const commandNames = envRoutes.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('list');
    expect(commandNames).toContain('pull');
    expect(commandNames).toContain('info');
  });

  it('saves, loads, and clears configuration safely', () => {
    saveConfig(testConfig);
    const loaded = loadConfig();
    expect(loaded).toBeDefined();
    expect(loaded?.baseUrl).toBe('https://sem.example.com');
    expect(loaded?.namespace).toBe('test-org');

    clearConfig();
    const afterClear = loadConfig();
    expect(afterClear).toBeNull();
  });
});
