/**
 * Authentication Commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig, debug } from './config.js';

interface AuthResponse {
  success: boolean;
  data?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  error?: string;
}

async function fetchApi(path: string, options: RequestInit = {}): Promise<unknown> {
  const config = loadConfig();
  if (!config) throw new Error('Not configured. Run: sem config init');

  const url = `${config.baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

export const authRoutes = new Command('auth')
  .description('Authentication commands');

// auth login
authRoutes
  .command('login')
  .description('Login to SEM')
  .option('-p, --password <password>', 'Password (will prompt if not provided)')
  .option('-n, --namespace <namespace>', 'Namespace', 'global')
  .option('-e, --environment <environment>', 'Environment', 'main')
  .action(async (options) => {
    let password = options.password;

    if (!password) {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
        },
      ]);
      password = answers.password;
    }

    console.log(chalk.gray('\nLogging in...'));

    try {
      const response = await fetchApi('/api/v1/auth/login', {
        method: 'POST',
        body: {
          namespace: options.namespace,
          environment: options.environment,
          password,
          deviceName: 'SEM CLI',
          deviceType: 'cli',
          platform: process.platform,
        },
      }) as AuthResponse;

      if (!response.success || !response.data) {
        console.log(chalk.red(`\nLogin failed: ${response.error || 'Unknown error'}`));
        process.exit(1);
      }

      const config = loadConfig() || { baseUrl: '', namespace: 'global', environment: 'main' };
      config.token = response.data.access_token;
      config.refreshToken = response.data.refresh_token;
      saveConfig(config);

      console.log(chalk.green('\n✓ Logged in successfully!'));
      console.log(chalk.gray(`  Namespace: ${options.namespace}`));
      console.log(chalk.gray(`  Environment: ${options.environment}`));
      console.log(chalk.gray(`  Token expires in: ${response.data.expires_in}s`));
    } catch (error) {
      console.log(chalk.red(`\nLogin failed: ${error}`));
      process.exit(1);
    }
  });

// auth logout
authRoutes
  .command('logout')
  .description('Logout and revoke tokens')
  .action(async () => {
    const config = loadConfig();
    if (!config?.token) {
      console.log(chalk.yellow('Not logged in'));
      return;
    }

    try {
      await fetchApi('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.token}` },
      });
    } catch (error) {
      debug('Logout API failed:', error);
    }

    config.token = undefined;
    config.refreshToken = undefined;
    saveConfig(config);

    console.log(chalk.green('\n✓ Logged out successfully!'));
  });

// auth status
authRoutes
  .command('status')
  .description('Check authentication status')
  .action(async () => {
    const config = loadConfig();

    if (!config?.token) {
      console.log(chalk.yellow('\nNot authenticated'));
      console.log(chalk.gray('Run: sem auth login'));
      return;
    }

    try {
      const response = await fetchApi('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${config.token}` },
      }) as { success: boolean; data?: { session_id: string; namespace: string; environment: string; is_admin: boolean } };

      if (response.success && response.data) {
        console.log(chalk.green('\n✓ Authenticated'));
        console.log(chalk.gray(`  Session: ${response.data.session_id.substring(0, 16)}...`));
        console.log(chalk.gray(`  Namespace: ${response.data.namespace}`));
        console.log(chalk.gray(`  Environment: ${response.data.environment}`));
        console.log(chalk.gray(`  Admin: ${response.data.is_admin ? 'Yes' : 'No'}`));
      }
    } catch (error) {
      console.log(chalk.red('Session expired or invalid'));
      config.token = undefined;
      config.refreshToken = undefined;
      saveConfig(config);
    }
  });

// auth refresh
authRoutes
  .command('refresh')
  .description('Refresh access token')
  .action(async () => {
    const config = loadConfig();

    if (!config?.refreshToken) {
      console.log(chalk.red('No refresh token available'));
      return;
    }

    try {
      const response = await fetchApi('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken: config.refreshToken },
      }) as AuthResponse;

      if (response.success && response.data) {
        config.token = response.data.access_token;
        config.refreshToken = response.data.refresh_token;
        saveConfig(config);
        console.log(chalk.green('Token refreshed!'));
      }
    } catch (error) {
      console.log(chalk.red(`Refresh failed: ${error}`));
    }
  });