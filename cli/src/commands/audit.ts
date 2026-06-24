/**
 * Audit and Sessions Commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import table from 'text-table';
import { loadConfig, debug } from './config.js';

async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const config = loadConfig();
  if (!config?.token) throw new Error('Not authenticated. Run: sem auth login');

  const url = `${config.baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

export const auditRoutes = new Command('audit')
  .description('Audit logs and session management');

// audit logs
auditRoutes
  .command('logs')
  .alias('log')
  .description('View audit logs')
  .option('-n, --namespace <namespace>', 'Filter by namespace')
  .option('-e, --environment <environment>', 'Filter by environment')
  .option('-p, --page <page>', 'Page number', '1')
  .option('--limit <limit>', 'Results per page', '50')
  .action(async (options) => {
    const params = new URLSearchParams({
      page: options.page,
      pageSize: options.limit,
    });
    if (options.namespace) params.set('namespace', options.namespace);
    if (options.environment) params.set('environment', options.environment);

    console.log(chalk.gray('\nFetching audit logs...\n'));

    try {
      const response = await authenticatedFetch(`/api/v1/audit/logs?${params.toString()}`) as {
        success: boolean;
        data?: {
          entries: Array<{
            timestamp: string;
            action: string;
            namespace?: string;
            environment?: string;
            userId?: string;
            ipAddress?: string;
            details?: Record<string, unknown>;
          }>;
          total: number;
        };
      };

      const entries = response.data?.entries || [];

      if (entries.length === 0) {
        console.log(chalk.yellow('No audit logs found'));
        return;
      }

      const header = ['Timestamp', 'Action', 'Namespace', 'Environment', 'IP'];
      const rows = entries.map((entry) => [
        new Date(entry.timestamp).toLocaleString(),
        entry.action,
        entry.namespace || '-',
        entry.environment || '-',
        entry.ipAddress || '-',
      ]);

      console.log(table([header, ...rows], { align: ['l', 'l', 'l', 'l', 'r'] }));
      console.log(chalk.gray(`\nTotal: ${response.data?.total || 0} entries`));
    } catch (error) {
      console.log(chalk.red(`\nFailed to fetch audit logs: ${error}`));
    }
  });

// audit sessions
auditRoutes
  .command('sessions')
  .description('List active sessions')
  .action(async () => {
    console.log(chalk.gray('\nFetching sessions...\n'));

    try {
      const response = await authenticatedFetch('/api/v1/auth/sessions') as {
        success: boolean;
        data?: {
          sessions: Array<{
            id: string;
            namespace: string;
            environment: string;
            created: string;
            last_active: string;
            ip: string;
            user_agent: string;
            is_valid: boolean;
          }>;
        };
      };

      const sessions = response.data?.sessions || [];

      if (sessions.length === 0) {
        console.log(chalk.yellow('No active sessions'));
        return;
      }

      const header = ['Session ID', 'Namespace', 'Environment', 'Created', 'IP'];
      const rows = sessions.map((s) => [
        s.id.substring(0, 16) + '...',
        s.namespace,
        s.environment,
        new Date(s.created).toLocaleDateString(),
        s.ip,
      ]);

      console.log(table([header, ...rows], { align: ['l', 'l', 'l', 'r', 'l'] }));
    } catch (error) {
      console.log(chalk.red(`\nFailed to fetch sessions: ${error}`));
    }
  });

// audit revoke-session
auditRoutes
  .command('revoke-session <sessionId>')
  .description('Revoke a specific session (admin only)')
  .action(async (sessionId) => {
    console.log(chalk.gray(`\nRevoking session: ${sessionId}\n`));

    try {
      await authenticatedFetch(`/api/v1/auth/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      console.log(chalk.green('✓ Session revoked successfully'));
    } catch (error) {
      console.log(chalk.red(`\nFailed to revoke session: ${error}`));
    }
  });

// audit devices
auditRoutes
  .command('devices')
  .description('List registered devices')
  .action(async () => {
    console.log(chalk.gray('\nFetching devices...\n'));

    try {
      const response = await authenticatedFetch('/api/v1/auth/devices') as {
        success: boolean;
        data?: {
          devices: Array<{
            device_id: string;
            device_name: string;
            device_type: string;
            platform: string;
            created_at: string;
            last_active: string;
            is_revoked: boolean;
          }>;
        };
      };

      const devices = response.data?.devices || [];

      if (devices.length === 0) {
        console.log(chalk.yellow('No devices registered'));
        return;
      }

      const header = ['Device ID', 'Name', 'Type', 'Platform', 'Status'];
      const rows = devices.map((d) => [
        d.device_id.substring(0, 16) + '...',
        d.device_name,
        d.device_type,
        d.platform,
        d.is_revoked ? 'REVOKED' : 'ACTIVE',
      ]);

      console.log(table([header, ...rows], { align: ['l', 'l', 'l', 'l', 'r'] }));
    } catch (error) {
      console.log(chalk.red(`\nFailed to fetch devices: ${error}`));
    }
  });

// audit revoke-device
auditRoutes
  .command('revoke-device <deviceId>')
  .description('Revoke a specific device')
  .action(async (deviceId) => {
    console.log(chalk.gray(`\nRevoking device: ${deviceId}\n`));

    try {
      await authenticatedFetch(`/api/v1/auth/devices/${deviceId}`, {
        method: 'DELETE',
      });

      console.log(chalk.green('✓ Device revoked successfully'));
    } catch (error) {
      console.log(chalk.red(`\nFailed to revoke device: ${error}`));
    }
  });