/**
 * WebSocket Commands - Real-time event subscriptions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from './config.js';

interface WsMessage {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export const wsRoutes = new Command('ws')
  .description('WebSocket realtime event subscriptions');

// ws subscribe
wsRoutes
  .command('subscribe [environment]')
  .description('Subscribe to realtime events')
  .option('-n, --namespace <namespace>', 'Namespace', 'global')
  .option('-e, --environment <environment>', 'Environment')
  .action(async (environment, options) => {
    const config = loadConfig();
    if (!config?.token) {
      console.log(chalk.red('Not authenticated. Run: sem auth login'));
      process.exit(1);
    }

    const ns = options.namespace || config.namespace || 'global';
    const env = environment || options.environment || config.environment || 'main';
    const wsUrl = `${config.baseUrl.replace(/^http/, 'ws')}://${config.baseUrl.replace(/^https?:\/\//, '')}/ws?token=${config.token}`;

    console.log(chalk.gray(`\nConnecting to WebSocket...`));
    console.log(chalk.gray(`Subscribing to: ${ns}/${env}`));
    console.log(chalk.gray('Press Ctrl+C to disconnect\n'));

    try {
      const WebSocket = await import('ws');
      const ws = new WebSocket.default(wsUrl);

      ws.on('open', () => {
        console.log(chalk.green('✓ Connected to WebSocket'));
        ws.send(JSON.stringify({
          event: 'subscribe',
          data: { namespace: ns, environment: env },
        }));
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WsMessage;
          handleWsMessage(message);
        } catch {
          console.log(chalk.red('Failed to parse message'));
        }
      });

      ws.on('close', () => {
        console.log(chalk.yellow('\nDisconnected from WebSocket'));
        process.exit(0);
      });

      ws.on('error', (error) => {
        console.log(chalk.red(`WebSocket error: ${error.message}`));
        process.exit(1);
      });

      // Keep process alive
      process.on('SIGINT', () => {
        ws.close();
        process.exit(0);
      });
    } catch (error) {
      console.log(chalk.red(`\nFailed to connect: ${error}`));
      process.exit(1);
    }
  });

// ws events
wsRoutes
  .command('events [environment]')
  .description('Display realtime events in terminal')
  .option('-n, --namespace <namespace>', 'Namespace', 'global')
  .option('--filter <event>', 'Filter by event type (secret, session, device)')
  .action(async (environment, options) => {
    const config = loadConfig();
    if (!config?.token) {
      console.log(chalk.red('Not authenticated. Run: sem auth login'));
      process.exit(1);
    }

    const ns = options.namespace || config.namespace || 'global';
    const env = environment || config.environment || 'main';
    const wsUrl = `${config.baseUrl.replace(/^http/, 'ws')}://${config.baseUrl.replace(/^https?:\/\//, '')}/ws?token=${config.token}`;

    console.log(chalk.gray(`\nConnecting to WebSocket...`));
    console.log(chalk.gray(`Watching: ${ns}/${env}\n`));

    try {
      const WebSocket = await import('ws');
      const ws = new WebSocket.default(wsUrl);

      ws.on('open', () => {
        console.log(chalk.green('✓ Connected'));
        ws.send(JSON.stringify({
          event: 'subscribe',
          data: { namespace: ns, environment: env },
        }));
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WsMessage;

          // Apply filter
          if (options.filter) {
            if (options.filter === 'secret' && !message.event.startsWith('secret:')) return;
            if (options.filter === 'session' && !message.event.startsWith('session:')) return;
            if (options.filter === 'device' && !message.event.startsWith('device:')) return;
          }

          const timestamp = new Date(message.timestamp).toLocaleTimeString();
          const eventColor = getEventColor(message.event);

          console.log(chalk.gray(`[${timestamp}]`) + eventColor(` ${message.event}`));

          if (message.data && Object.keys(message.data).length > 0) {
            console.log(chalk.gray('  '), JSON.stringify(message.data));
          }
        } catch {
          // Ignore parse errors
        }
      });

      ws.on('close', () => {
        console.log(chalk.yellow('\nConnection closed'));
        process.exit(0);
      });

      process.on('SIGINT', () => {
        ws.close();
        process.exit(0);
      });
    } catch (error) {
      console.log(chalk.red(`\nFailed to connect: ${error}`));
      process.exit(1);
    }
  });

function handleWsMessage(message: WsMessage): void {
  const timestamp = new Date(message.timestamp).toLocaleTimeString();

  switch (message.event) {
    case 'connected':
      console.log(chalk.green(`[${timestamp}] Connected successfully`));
      break;

    case 'subscribed':
      console.log(chalk.green(`[${timestamp}] Subscribed to ${message.data.room}`));
      break;

    case 'secret:created':
    case 'secret:updated':
    case 'secret:deleted':
    case 'secret:bulk_update':
      console.log(chalk.cyan(`[${timestamp}] Secret ${message.event.split(':')[1]}: ${message.data.key || 'bulk'}`));
      break;

    case 'session:revoked':
      console.log(chalk.red(`[${timestamp}] Session revoked: ${message.data.sessionId}`));
      break;

    case 'device:revoked':
      console.log(chalk.red(`[${timestamp}] Device revoked: ${message.data.deviceId}`));
      break;

    case 'audit:event':
      console.log(chalk.yellow(`[${timestamp}] Audit: ${message.data.action}`));
      break;

    default:
      console.log(chalk.gray(`[${timestamp}] ${message.event}`));
  }
}

function getEventColor(event: string): (text: string) => string {
  if (event.startsWith('secret:')) return chalk.cyan;
  if (event.startsWith('session:') || event.startsWith('device:')) return chalk.red;
  if (event === 'subscribed' || event === 'connected') return chalk.green;
  return chalk.white;
}