/**
 * Centralized client-side logging for Secure Environment Manager.
 * Provides structured logging with context, levels, and transport options.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.CRITICAL]: "CRITICAL",
};

export type LogContext = {
  namespace?: string;
  environment?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: string | undefined;
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: SerializedError;
  stack?: string;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  status?: number;
  code?: string;
}

// In-memory log buffer for debugging and replay
const LOG_BUFFER: LogEntry[] = [];
const MAX_BUFFER_SIZE = 500;

// Subscribers for real-time log events (e.g., external logging services)
type LogSubscriber = (entry: LogEntry) => void;
const _subscribers: Set<LogSubscriber> = new Set();

function _shouldLog(level: LogLevel): boolean {
  if (typeof window === "undefined") return false;
  const envLevel = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_LOG_LEVEL) as string | undefined;
  if (!envLevel) return level >= LogLevel.INFO;
  const config =
    envLevel.toUpperCase() === "DEBUG"
      ? LogLevel.DEBUG
      : envLevel.toUpperCase() === "WARN"
      ? LogLevel.WARN
      : envLevel.toUpperCase() === "ERROR"
      ? LogLevel.ERROR
      : LogLevel.INFO;
  return level >= config;
}

function _formatTimestamp(): string {
  return new Date().toISOString();
}

function _buildEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: _formatTimestamp(),
    level,
    message,
    context,
  };
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    if ((error as unknown as { status?: number }).status) {
      entry.error.status = (error as unknown as { status: number }).status;
    }
    if ((error as unknown as { code?: string }).code) {
      entry.error.code = (error as unknown as { code: string }).code;
    }
  }
  return entry;
}

function _publish(entry: LogEntry): void {
  if (LOG_BUFFER.length >= MAX_BUFFER_SIZE) {
    LOG_BUFFER.shift();
  }
  LOG_BUFFER.push(entry);
  _subscribers.forEach((sub) => {
    try {
      sub(entry);
    } catch {
      // Silently ignore subscriber errors
    }
  });
}

function _consoleAppender(entry: LogEntry): void {
  const label = `[SEM] ${entry.timestamp} ${LOG_LEVEL_NAMES[entry.level]}`;
  const meta = {
    ...entry.context,
    ...(entry.error ? { error: entry.error } : {}),
  };
  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(label, entry.message, meta);
      break;
    case LogLevel.INFO:
      console.info(label, entry.message, meta);
      break;
    case LogLevel.WARN:
      console.warn(label, entry.message, meta);
      break;
    case LogLevel.ERROR:
    case LogLevel.CRITICAL:
      console.error(label, entry.message, meta);
      break;
  }
}

/**
 * Subscribe to log events for external transport (e.g., remote logging).
 */
export function subscribe(subscriber: LogSubscriber): () => void {
  _subscribers.add(subscriber);
  return () => _subscribers.delete(subscriber);
}

/**
 * Get the current log buffer for debugging.
 */
export function getLogBuffer(): LogEntry[] {
  return [...LOG_BUFFER];
}

/**
 * Clear the log buffer.
 */
export function clearLogBuffer(): void {
  LOG_BUFFER.length = 0;
}

/**
 * Logger singleton with fluent context API.
 */
export class Logger {
  private _context: LogContext = {};

  constructor(context?: LogContext) {
    this._context = context ?? {};
  }

  /**
   * Add context fields to this logger instance.
   */
  withContext(extra: LogContext): Logger {
    const child = new Logger({ ...this._context, ...extra });
    return child;
  }

  private _log(level: LogLevel, message: string, error?: Error): void {
    if (!_shouldLog(level)) return;
    const entry = _buildEntry(level, message, this._context, error);
    _consoleAppender(entry);
    _publish(entry);
  }

  debug(message: string): void {
    this._log(LogLevel.DEBUG, message);
  }

  info(message: string): void {
    this._log(LogLevel.INFO, message);
  }

  warn(message: string): void {
    this._log(LogLevel.WARN, message);
  }

  error(message: string, err?: Error): void {
    this._log(LogLevel.ERROR, message, err);
  }

  critical(message: string, err?: Error): void {
    this._log(LogLevel.CRITICAL, message, err);
  }

  /**
   * Log an API interaction with full request/response context.
   */
  api(label: string, meta: { method: string; path: string; status?: number; duration?: number; error?: Error }): void {
    const level = meta.error ? LogLevel.ERROR : meta.status && meta.status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.withContext({
      api_label: label,
      api_method: meta.method,
      api_path: meta.path,
      api_status: String(meta.status ?? 0),
      api_duration_ms: String(meta.duration ?? 0),
    })._log(level, meta.error ? `API error: ${meta.error.message}` : `API: ${label}`, meta.error);
  }
}

// Default logger instance
let _defaultLogger: Logger | null = null;

export function logger(): Logger {
  if (!_defaultLogger) {
    _defaultLogger = new Logger({ component: "frontend" });
  }
  return _defaultLogger;
}

// Convenient helpers
export const log = {
  debug: (msg: string) => logger().debug(msg),
  info: (msg: string) => logger().info(msg),
  warn: (msg: string) => logger().warn(msg),
  error: (msg: string, err?: Error) => logger().error(msg, err),
  critical: (msg: string, err?: Error) => logger().critical(msg, err),
  forComponent: (component: string) => new Logger({ component }),
  api: (label: string, meta: { method: string; path: string; status?: number; duration?: number; error?: Error }) => {
    const level = meta.error ? LogLevel.ERROR : meta.status && meta.status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const msg = meta.error ? `API error: ${meta.error.message}` : `API: ${label}`;
    logger().withContext({
      api_label: label,
      api_method: meta.method,
      api_path: meta.path,
      api_status: meta.status ?? 0,
      api_duration_ms: meta.duration ?? 0,
    }).info(msg);
  },
};

// API request/response logger helper
export function logApiRequest(
  method: string,
  path: string,
  options?: { namespace?: string; environment?: string }
): { onResponse: (status: number, duration: number, error?: Error) => void; abort: () => void } {
  const start = performance.now();
  let aborted = false;
  return {
    onResponse(status: number, duration: number, error?: Error) {
      if (aborted) return;
      log.api(`${method} ${path}`, {
        method,
        path,
        status,
        duration,
        error,
      });
    },
    abort() {
      aborted = true;
    },
  };
}