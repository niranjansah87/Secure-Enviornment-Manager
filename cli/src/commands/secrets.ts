/**
 * Secrets Commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import table from 'text-table';
import inquirer from 'inquirer';
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

export const secretsRoutes = new Command('secrets')
  .description('Secrets management commands');

const DEFAULT_NAMESPACE = () => loadConfig()?.namespace || 'global';
const DEFAULT_ENV = () => loadConfig()?.environment || 'main';

// secrets list
secretsRoutes
  .command('list')
  .alias('ls')
  .description('List secrets in an environment')
  .option('-n, --namespace <namespace>', 'Namespace', DEFAULT_NAMESPACE())
  .option('-e, --environment <environment>', 'Environment', DEFAULT_ENV())
  .option('--format <format>', 'Output format: table, json, plain', 'table')
  .action(async (options) => {
    console.log(chalk.gray(`\nFetching secrets for ${options.namespace}/${options.environment}...\n`));

    try {
      const response = await authenticatedFetch(
        `/api/v1/${encodeURIComponent(options.namespace)}/${encodeURIComponent(options.environment)}`
      ) as { success: boolean; data?: { secrets: Record<string, string> } };

      const secrets = response.data?.secrets || {};

      if (Object.keys(secrets).length === 0) {
        console.log(chalk.yellow('No secrets found'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(secrets, null, 2));
        return;
      }

      if (options.format === 'plain') {
        Object.keys(secrets).forEach((key) => console.log(key));
        return;
      }

      const header = ['Key', 'Value'];
      const rows = Object.entries(secrets).map(([key, value]) => [
        key,
        value.length > 50 ? value.substring(0, 50) + '...' : value,
      ]);

      console.log(table([header, ...rows], { align: ['l', 'l'] }));
      console.log(chalk.gray(`\nTotal: ${Object.keys(secrets).length} secrets`));
    } catch (error) {
      console.log(chalk.red(`\nFailed to list secrets: ${error}`));
    }
  });

// secrets get
secretsRoutes
  .command('get <key>')
  .alias('show')
  .description('Get a specific secret value')
  .option('-n, --namespace <namespace>', 'Namespace', DEFAULT_NAMESPACE())
  .option('-e, --environment <environment>', 'Environment', DEFAULT_ENV())
  .action(async (key, options) => {
    console.log(chalk.gray(`\nFetching secret: ${key}\n`));

    try {
      const response = await authenticatedFetch(
        `/api/v1/${encodeURIComponent(options.namespace)}/${encodeURIComponent(options.environment)}/${encodeURIComponent(key)}`
      ) as { success: boolean; data?: { value: string } };

      if (response.success && response.data) {
        console.log(response.data.value);
      } else {
        console.log(chalk.red('Secret not found'));
      }
    } catch (error) {
      console.log(chalk.red(`\nFailed to get secret: ${error}`));
    }
  });

// secrets set
secretsRoutes
  .command('set <key> [value]')
  .description('Create or update a secret')
  .option('-n, --namespace <namespace>', 'Namespace', DEFAULT_NAMESPACE())
  .option('-e, --environment <environment>', 'Environment', DEFAULT_ENV())
  .option('-f, --from-file <file>', 'Read value from file')
  .action(async (key, value, options) => {
    let secretValue = value;

    if (!secretValue) {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'value',
          message: `Value for ${key}:`,
          mask: '*',
        },
      ]);
      secretValue = answers.value;
    }

    if (!secretValue && !options.fromFile) {
      console.log(chalk.red('No value provided. Use --from-file or provide value as argument'));
      return;
    }

    if (options.fromFile) {
      const fs = await import('fs');
      secretValue = fs.readFileSync(options.fromFile, 'utf-8').trim();
    }

    console.log(chalk.gray(`\nSetting secret: ${key}\n`));

    try {
      await authenticatedFetch(
        `/api/v1/${encodeURIComponent(options.namespace)}/${encodeURIComponent(options.environment)}/${encodeURIComponent(key)}`,
        {
          method: 'PUT',
          body: { value: secretValue },
        }
      );

      console.log(chalk.green(`✓ Secret ${key} set successfully`));
    } catch (error) {
      console.log(chalk.red(`\nFailed to set secret: ${error}`));
    }
  });

// secrets delete
secretsRoutes
  .command('delete <key>')
  .alias('rm')
  .description('Delete a secret')
  .option('-n, --namespace <namespace>', 'Namespace', DEFAULT_NAMESPACE())
  .option('-e, --environment <environment>', 'Environment', DEFAULT_ENV())
  .option('--force', 'Skip confirmation')
  .action(async (key, options) => {
    if (!options.force) {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Delete secret ${key}?`,
          default: false,
        },
      ]);
      if (!answers.confirm) {
        console.log(chalk.yellow('Cancelled'));
        return;
      }
    }

    console.log(chalk.gray(`\nDeleting secret: ${key}\n`));

    try {
      await authenticatedFetch(
        `/api/v1/${encodeURIComponent(options.namespace)}/${encodeURIComponent(options.environment)}/${encodeURIComponent(key)}`,
        { method: 'DELETE' }
      );

      console.log(chalk.green(`✓ Secret ${key} deleted successfully`));
    } catch (error) {
      console.log(chalk.red(`\nFailed to delete secret: ${error}`));
    }
  });

// secrets bulk
secretsRoutes
  .command('bulk <operation>')
  .description('Bulk operation on secrets (upsert, delete)')
  .option('-n, --namespace <namespace>', 'Namespace', DEFAULT_NAMESPACE())
  .option('-e, --environment <environment>', 'Environment', DEFAULT_ENV())
  .option('-f, --file <file>', 'Secrets file (.env format)')
  .action(async (operation, options) => {
    if (!['upsert', 'delete'].includes(operation)) {
      console.log(chalk.red('Operation must be: upsert or delete'));
      return;
    }

    if (!options.file) {
      console.log(chalk.red('Please provide --file option'));
      return;
    }

    const fs = await import('fs');
    const content = fs.readFileSync(options.file, 'utf-8');
    const secrets: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...rest] = line.split('=');
        if (key) {
          secrets[key.trim()] = rest.join('=').trim();
        }
      }
    });

    console.log(chalk.gray(`\nPerforming bulk ${operation} on ${Object.keys(secrets).length} secrets...\n`));

    try {
      await authenticatedFetch(
        `/api/v1/${encodeURIComponent(options.namespace)}/${encodeURIComponent(options.environment)}/bulk`,
        {
          method: 'POST',
          body: { operation, secrets },
        }
      );

      console.log(chalk.green(`✓ Bulk ${operation} completed`));
    } catch (error) {
      console.log(chalk.red(`\nFailed to perform bulk operation: ${error}`));
    }
  });