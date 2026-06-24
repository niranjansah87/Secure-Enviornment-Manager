#!/usr/bin/env node
/**
 * SEM CLI - Main Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { configRoutes } from './commands/config.js';
import { authRoutes } from './commands/auth.js';
import { envRoutes } from './commands/env.js';
import { secretsRoutes } from './commands/secrets.js';
import { auditRoutes } from './commands/audit.js';
import { runRoutes } from './commands/run.js';
import { wsRoutes } from './commands/ws.js';

const program = new Command();

// CLI Info
program
  .name('sem')
  .description('Secure Environment Manager - CLI for secrets and environment management')
  .version('1.0.0');

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-o, --output <type>', 'Output format: json, table, plain', 'table')
  .option('-c, --config <path>', 'Config file path', process.env.HOME + '/.sem/config.json')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      process.env.SEM_DEBUG = 'true';
    }
    if (opts.output) {
      process.env.SEM_OUTPUT = opts.output;
    }
  });

// Register command groups
program.addCommand(configRoutes);
program.addCommand(authRoutes);
program.addCommand(envRoutes);
program.addCommand(secretsRoutes);
program.addCommand(auditRoutes);
program.addCommand(runRoutes);
program.addCommand(wsRoutes);

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow(`Run 'sem --help' for available commands`));
  process.exit(1);
});

program.configureOutput({
  writeErr: (str) => console.error(chalk.red(str)),
  writeOut: (str) => process.stdout.write(str),
});

program.parse(process.argv);