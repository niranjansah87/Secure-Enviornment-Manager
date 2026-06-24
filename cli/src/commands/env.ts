/**
 * Environment Commands
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

  const data = await response.json();
  if (!response.ok && response.status !== 401) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

export const envRoutes = new Command('env')
  .description('Environment management commands');

// env list
envRoutes
  .command('list')
  .alias('ls')
  .description('List all available environments')
  .option('-n, --namespace <namespace>', 'Filter by namespace')
  .action(async (options) => {
    console.log(chalk.gray('\nFetching environments...\n'));

    try {
      const response = await authenticatedFetch('/api/v1/environments') as {
        success: boolean;
        data?: { environments: Array<{ namespace: string; environment: string; lastUpdated?: string }> };
      };

      const environments = response.data?.environments || [];

      if (environments.length === 0) {
        console.log(chalk.yellow('No environments found'));
        return;
      }

      const header = ['Namespace', 'Environment', 'Last Updated'];
      const rows = environments.map((env) => [
        env.namespace,
        env.environment,
        env.lastUpdated ? new Date(env.lastUpdated).toLocaleDateString() : '-',
      ]);

      console.log(table([header, ...rows], { align: ['l', 'l', 'r'] }));
    } catch (error) {
      console.log(chalk.red(`\nFailed to list environments: ${error}`));
    }
  });

// env pull
envRoutes
  .command('pull [environment]')
  .alias('export')
  .description('Pull environment secrets as .env file')
  .option('-n, --namespace <namespace>', 'Namespace', 'global')
  .option('-o, --output <file>', 'Output file (stdout if not specified)')
  .action(async (environment, options) => {
    const env = environment || options.environment || loadConfig()?.environment || 'main';
    console.log(chalk.gray(`\nPulling secrets for ${options.namespace}/${env}...\n`));

    try {
      const response = await authenticatedFetch(
        `/api/v1/${encodeURIComponent(options.namespace)}/${encodeURIComponent(env)}`
      ) as { success: boolean; data?: { secrets: Record<string, string> } };

      const secrets = response.data?.secrets || {};

      if (Object.keys(secrets).length === 0) {
        console.log(chalk.yellow('No secrets found'));
        return;
      }

      const envContent = Object.entries(secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, envContent);
        console.log(chalk.green(`✓ Secrets exported to ${options.output}`));
      } else {
        console.log(envContent);
      }
    } catch (error) {
      console.log(chalk.red(`\nFailed to pull secrets: ${error}`));
    }
  });

// env info
envRoutes
  .command('info [environment]')
  .description('Show environment information')
  .option('-n, --namespace <namespace>', 'Namespace', 'global')
  .action(async (environment, options) => {
    const env = environment || options.environment || loadConfig()?.environment || 'main';
    console.log(chalk.gray(`\nFetching info for ${options.namespace}/${env}...\n`));

    try {
      const response = await authenticatedFetch(
        `/api/v1/${encodeURIComponent(options.namespace)}/${encodeURIComponent(env)}`
      ) as { success: boolean; data?: { total: number; lastUpdated?: string } };

      if (response.success && response.data) {
        console.log(chalk.bold('Environment Info:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(`  Namespace:   ${options.namespace}`);
        console.log(`  Environment: ${env}`);
        console.log(`  Secret Count: ${response.data.total}`);
        console.log(`  Last Updated: ${response.data.lastUpdated || 'Never'}`);
      }
    } catch (error) {
      console.log(chalk.red(`\nFailed to get environment info: ${error}`));
    }
  });