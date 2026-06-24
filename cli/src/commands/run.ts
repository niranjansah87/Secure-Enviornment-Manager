/**
 * Run Command - Execute with environment secrets
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from './config.js';

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

export const runRoutes = new Command('run')
  .description('Run commands with environment secrets');

// run --env <environment> -- <command>
runRoutes
  .command('exec [environment]')
  .description('Execute a command with secrets loaded as environment variables')
  .option('-n, --namespace <namespace>', 'Namespace', 'global')
  .option('-s, --silent', 'Silent mode - only output command stdout')
  .option('--env-only', 'Only output .env file content')
  .action(async (environment, options) => {
    const config = loadConfig();
    if (!config?.token) {
      console.log(chalk.red('Not authenticated. Run: sem auth login'));
      process.exit(1);
    }

    const env = environment || config.environment || 'main';
    const namespace = options.namespace || config.namespace || 'global';

    console.log(chalk.gray(`Loading secrets for ${namespace}/${env}...`));

    try {
      const response = await authenticatedFetch(
        `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(env)}`
      ) as { success: boolean; data?: { secrets: Record<string, string> } };

      const secrets = response.data?.secrets || {};

      if (options.envOnly) {
        Object.entries(secrets).forEach(([key, value]) => {
          console.log(`${key}=${value}`);
        });
        return;
      }

      // Set environment variables and execute command
      const env = { ...process.env, ...secrets };
      const command = process.argv.slice(process.argv.indexOf('exec') + 2).join(' ');

      if (!command) {
        console.log(chalk.yellow('No command provided. Use --env-only to see secrets.'));
        return;
      }

      if (!options.silent) {
        console.log(chalk.gray(`\nExecuting: ${command}\n`));
      }

      const { spawn } = await import('child_process');
      const child = spawn(command, [], {
        shell: true,
        env,
        stdio: 'inherit',
      });

      child.on('exit', (code) => {
        process.exit(code || 0);
      });
    } catch (error) {
      console.log(chalk.red(`\nFailed to load secrets: ${error}`));
      process.exit(1);
    }
  });

// run export
runRoutes
  .command('export [environment]')
  .description('Export secrets as environment variables for shell')
  .option('-n, --namespace <namespace>', 'Namespace', 'global')
  .option('-p, --prefix <prefix>', 'Variable prefix', '')
  .action(async (environment, options) => {
    const config = loadConfig();
    if (!config?.token) {
      console.log(chalk.red('Not authenticated. Run: sem auth login'));
      process.exit(1);
    }

    const env = environment || config.environment || 'main';
    const namespace = options.namespace || config.namespace || 'global';

    try {
      const response = await authenticatedFetch(
        `/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(env)}`
      ) as { success: boolean; data?: { secrets: Record<string, string> } };

      const secrets = response.data?.secrets || {};
      const prefix = options.prefix;

      Object.entries(secrets).forEach(([key, value]) => {
        const varName = prefix ? `${prefix}${key}` : key;
        console.log(`export ${varName}='${value.replace(/'/g, "'\\''")}'`);
      });
    } catch (error) {
      console.log(chalk.red(`\nFailed to export secrets: ${error}`));
      process.exit(1);
    }
  });