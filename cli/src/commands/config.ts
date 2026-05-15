/**
 * CLI Configuration Management
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

export interface CliConfig {
  baseUrl: string;
  wsUrl?: string;
  namespace: string;
  environment: string;
  token?: string;
  refreshToken?: string;
}

const CONFIG_DIR = process.env.HOME + '/.sem';
const CONFIG_FILE = CONFIG_DIR + '/config.json';

export function loadConfig(): CliConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    debug('Failed to load config:', error);
  }
  return null;
}

export function saveConfig(config: CliConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function clearConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (error) {
    debug('Failed to clear config:', error);
  }
}

export function debug(...args: unknown[]): void {
  if (process.env.SEM_DEBUG) {
    console.log(chalk.gray('[DEBUG]'), ...args);
  }
}

export const configRoutes = new Command('config')
  .description('Manage CLI configuration');

// config show
configRoutes
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();
    if (!config) {
      console.log(chalk.yellow('No configuration found. Run: sem config init'));
      return;
    }
    console.log(chalk.bold('\nCurrent Configuration:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  Base URL:    ${config.baseUrl}`);
    console.log(`  WebSocket:   ${config.wsUrl || 'auto'}`);
    console.log(`  Namespace:   ${config.namespace}`);
    console.log(`  Environment: ${config.environment}`);
    console.log(`  Authenticated: ${config.token ? 'Yes' : 'No'}`);
    console.log();
  });

// config init
configRoutes
  .command('init')
  .description('Initialize CLI configuration')
  .action(async () => {
    console.log(chalk.bold('\nSEM CLI Configuration\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Backend URL:',
        default: 'http://localhost:8070',
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      },
      {
        type: 'input',
        name: 'namespace',
        message: 'Default namespace:',
        default: 'global',
      },
      {
        type: 'input',
        name: 'environment',
        message: 'Default environment:',
        default: 'main',
      },
    ]);

    const config: CliConfig = {
      baseUrl: answers.baseUrl,
      namespace: answers.namespace,
      environment: answers.environment,
    };

    saveConfig(config);
    console.log(chalk.green('\nConfiguration saved!'));
    console.log(chalk.gray('Run: sem login'));
  });

// config set
configRoutes
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key, value) => {
    const config = loadConfig();
    if (!config) {
      console.log(chalk.red('No configuration found. Run: sem config init'));
      return;
    }

    switch (key.toLowerCase()) {
      case 'baseurl':
        config.baseUrl = value;
        break;
      case 'namespace':
        config.namespace = value;
        break;
      case 'environment':
        config.environment = value;
        break;
      default:
        console.log(chalk.red(`Unknown config key: ${key}`));
        console.log('Valid keys: baseurl, namespace, environment');
        return;
    }

    saveConfig(config);
    console.log(chalk.green(`Configuration updated: ${key} = ${value}`));
  });

// config clear
configRoutes
  .command('clear')
  .description('Clear all configuration and logout')
  .action(() => {
    clearConfig();
    console.log(chalk.green('Configuration cleared!'));
  });