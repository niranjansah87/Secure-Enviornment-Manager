/**
 * Centralized logging for Secure Environment Manager frontend.
 * Structured logging with context, levels, transports, and subscriber pattern.
 */
import type { LogEntry, SerializedError, LogContext } from "./context";

export { type LogEntry, type SerializedError, type LogContext } from "./context";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.CRITICAL]: "CRITICAL",
};

// In-memory ring buffer
const _buffer: LogEntry[] = [];
const _maxBufferSize = 500;
let _subscriber: ((entry: LogEntry) => void) | null = null;

export function setGlobalLogSubscriber(fn: ((entry: LogEntry) => void) | null): void {
  _subscriber = fn;
}

function _shouldLog(level: LogLevel): boolean {
  if (typeof window === "undefined") return false;
  const env = (typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_LOG_LEVEL : undefined)?.toUpperCase();
  if (!env) return level >= LogLevel.INFO;
  const config =
    env === "DEBUG" ? LogLevel.DEBUG :
    env === "WARN" ? LogLevel.WARN :
    env === "ERROR" ? LogLevel.ERROR :
    LogLevel.INFO;
  return level >= config;
}

function _fmt(): string {
  return new Date().toISOString();
}

function _publish(entry: LogEntry): void {
  if (_buffer.length >= _maxBufferSize) _buffer.shift();
  _buffer.push(entry);
  _subscriber?.(entry);
}

function _buildEntry(
  level: LogLevel,
  message: string,
  ctx?: LogContext,
  err?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: _fmt(),
    level,
    message,
    context: ctx,
  };
  if (err) {
    entry.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    const e = err as unknown as { status?: number; code?: string };
    if (e.status) entry.error.status = e.status;
    if (e.code) entry.error.code = e.code;
  }
  return entry;
}

function _console(entry: LogEntry): void {
  const label = `[SEM] ${entry.timestamp} ${LEVEL_NAMES[entry.level as LogLevel]}`;
  const meta = { ...entry.context, ...(entry.error ? { error: entry.error } : {}) };
  // Format meta as a clean single-line JSON string for consistent display
  const metaStr = JSON.stringify(meta);
  const msg = `${label} ${entry.message} ${metaStr}`;
  switch (entry.level) {
    case LogLevel.DEBUG: console.debug(msg); break;
    case LogLevel.INFO: console.info(msg); break;
    case LogLevel.WARN: console.warn(msg); break;
    case LogLevel.ERROR:
    case LogLevel.CRITICAL: console.error(msg); break;
  }
}

export class Logger {
  private _ctx: LogContext;

  constructor(ctx?: LogContext) {
    this._ctx = ctx ?? {};
  }

  withContext(extra: LogContext): Logger {
    return new Logger({ ...this._ctx, ...extra });
  }

  _log(level: LogLevel, message: string, err?: Error): void {
    if (!_shouldLog(level)) return;
    const entry = _buildEntry(level, message, this._ctx, err);
    _console(entry);
    _publish(entry);
  }

  debug(msg: string): void { this._log(LogLevel.DEBUG, msg); }
  info(msg: string): void { this._log(LogLevel.INFO, msg); }
  warn(msg: string): void { this._log(LogLevel.WARN, msg); }
  error(msg: string, err?: Error): void { this._log(LogLevel.ERROR, msg, err); }
  critical(msg: string, err?: Error): void { this._log(LogLevel.CRITICAL, msg, err); }
}

let _singleton: Logger | null = null;
function _logger(): Logger {
  if (!_singleton) _singleton = new Logger({ component: "frontend" });
  return _singleton;
}

export const log = {
  debug: (msg: string) => _logger().debug(msg),
  info: (msg: string) => _logger().info(msg),
  warn: (msg: string) => _logger().warn(msg),
  error: (msg: string, err?: Error) => _logger().error(msg, err),
  critical: (msg: string, err?: Error) => _logger().critical(msg, err),
  forComponent: (c: string) => new Logger({ component: c }),
  forContext: (ctx: LogContext) => new Logger(ctx),
};

export function getLogBuffer(): LogEntry[] {
  return [..._buffer];
}

// API request tracker
export function trackApi(
  method: string,
  path: string,
  ctx?: { namespace?: string; environment?: string }
): { onResponse: (status: number, ms: number, err?: Error) => void; abort: () => void } {
  let aborted = false;
  return {
    onResponse(status: number, ms: number, err?: Error) {
      if (aborted) return;
      const level = err ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;
      const msg = err ? `API error: ${err.message}` : `API ${method} ${path}`;
      _logger().withContext({
        api_method: method,
        api_path: path,
        api_status: status,
        api_duration_ms: ms,
        ...ctx,
      })._log(level, msg, err);
    },
    abort() { aborted = true; },
  };
}