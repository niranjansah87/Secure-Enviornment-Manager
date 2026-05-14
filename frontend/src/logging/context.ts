/**
 * Shared types for the logging system.
 */
export interface LogContext {
  component?: string;
  namespace?: string;
  environment?: string;
  api_label?: string;
  api_method?: string;
  api_path?: string;
  api_status?: string;
  api_duration_ms?: string;
  user_id?: string;
  session_id?: string;
  [key: string]: string | undefined;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  status?: number;
  code?: string;
}

export interface LogEntry {
  timestamp: string;
  level: number;
  message: string;
  context?: LogContext;
  error?: SerializedError;
  stack?: string;
}