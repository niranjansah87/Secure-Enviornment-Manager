/**
 * Centralized error translation for Secure Environment Manager.
 * Maps backend/system errors to user-friendly messages with recovery actions.
 */
export type Severity = "info" | "warning" | "error" | "critical";

export interface UserError {
  title: string;
  description: string;
  suggestion?: string;
  severity: Severity;
  code: string;
}

// Predefined error catalog
const ERRORS: Record<string, UserError> = {
  // Auth (401/403)
  AUTH_TOKEN_MISSING: {
    title: "Authentication required",
    description: "Your request does not include an API token.",
    suggestion: "Add your API token in Settings.",
    severity: "error",
    code: "AUTH_TOKEN_MISSING",
  },
  AUTH_TOKEN_INVALID: {
    title: "Invalid API token",
    description: "The API token is not valid or has been revoked.",
    suggestion: "Check your API token in Settings, or generate a new one.",
    severity: "error",
    code: "AUTH_TOKEN_INVALID",
  },
  AUTH_NAMESPACE_FORBIDDEN: {
    title: "Access denied",
    description: "Your API token does not have access to this namespace.",
    suggestion: "Contact your administrator to get access.",
    severity: "error",
    code: "AUTH_NAMESPACE_FORBIDDEN",
  },
  AUTH_MASTER_REQUIRED: {
    title: "Administrator access required",
    description: "This operation requires master token privileges.",
    suggestion: "Contact your system administrator.",
    severity: "error",
    code: "AUTH_MASTER_REQUIRED",
  },

  // Session
  SESSION_EXPIRED: {
    title: "Session expired",
    description: "Your session has expired due to inactivity or the maximum session duration was reached.",
    suggestion: "Sign in again to continue.",
    severity: "warning",
    code: "SESSION_EXPIRED",
  },
  STEP_UP_REQUIRED: {
    title: "Additional verification needed",
    description: "This action requires you to re-enter your password.",
    suggestion: "Click 'Verify Identity' to complete step-up authentication.",
    severity: "warning",
    code: "STEP_UP_REQUIRED",
  },

  // Validation (400)
  VALIDATION_KEY_INVALID: {
    title: "Invalid variable name",
    description: "The variable key contains disallowed characters or is too long.",
    suggestion: "Use letters, numbers, underscore, dot, and hyphens only (max 128 chars).",
    severity: "error",
    code: "VALIDATION_KEY_INVALID",
  },
  VALIDATION_PAYLOAD_EMPTY: {
    title: "No valid entries",
    description: "The submitted data contains no valid key-value pairs.",
    suggestion: "Ensure each line follows the format: KEY=value",
    severity: "warning",
    code: "VALIDATION_PAYLOAD_EMPTY",
  },
  VALIDATION_JSON_REQUIRED: {
    title: "Invalid request format",
    description: "The request body must be a valid JSON object.",
    suggestion: "Check that your request is properly formatted.",
    severity: "error",
    code: "VALIDATION_JSON_REQUIRED",
  },

  // Storage (404)
  STORAGE_NOT_FOUND: {
    title: "Environment not found",
    description: "The requested namespace or environment does not exist.",
    suggestion: "Check that the namespace and environment names are correct.",
    severity: "error",
    code: "STORAGE_NOT_FOUND",
  },
  STORAGE_KEY_NOT_FOUND: {
    title: "Variable not found",
    description: "The variable you tried to delete does not exist.",
    suggestion: "Refresh the page to see the current list of variables.",
    severity: "info",
    code: "STORAGE_KEY_NOT_FOUND",
  },
  STORAGE_DECRYPTION_FAILED: {
    title: "Data corruption detected",
    description: "The secret data for this environment appears to be corrupted.",
    suggestion: "Contact your administrator to restore from a backup.",
    severity: "critical",
    code: "STORAGE_DECRYPTION_FAILED",
  },

  // Rate limit (429)
  RATE_LIMIT_EXCEEDED: {
    title: "Too many requests",
    description: "You have made too many requests in a short time period.",
    suggestion: "Wait a moment and try again.",
    severity: "warning",
    code: "RATE_LIMIT_EXCEEDED",
  },

  // Network
  NETWORK_CONNECTION_FAILED: {
    title: "Connection failed",
    description: "Could not connect to the server.",
    suggestion: "Check your internet connection.",
    severity: "error",
    code: "NETWORK_CONNECTION_FAILED",
  },
  NETWORK_TIMEOUT: {
    title: "Request timed out",
    description: "The server took too long to respond.",
    suggestion: "Try again in a few moments.",
    severity: "warning",
    code: "NETWORK_TIMEOUT",
  },

  // Internal (500)
  INTERNAL_ERROR: {
    title: "Something went wrong",
    description: "An unexpected error occurred on the server.",
    suggestion: "Try again in a few moments.",
    severity: "error",
    code: "INTERNAL_ERROR",
  },

  // Lockout
  AUTH_LOCKED_OUT: {
    title: "Account locked",
    description: "Too many failed login attempts. Your account is temporarily locked.",
    suggestion: "Wait a few minutes, or contact your administrator.",
    severity: "critical",
    code: "AUTH_LOCKED_OUT",
  },
};

function detectCode(msg: string, status: number): string {
  const m = msg.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (m.includes("TOKEN_MISSING") || m.includes("AUTHORIZATION_HEADER_MISSING")) return "AUTH_TOKEN_MISSING";
  if (m.includes("INVALID_API_KEY") || m.includes("INVALID_TOKEN") || m.includes("TOKEN_INVALID")) return "AUTH_TOKEN_INVALID";
  if (m.includes("FORBIDDEN") || m.includes("NOT_ALLOWED") || m.includes("NAMESPACE_FORBIDDEN")) return "AUTH_NAMESPACE_FORBIDDEN";
  if (m.includes("MASTER_REQUIRED") || m.includes("ADMINISTRATIVE")) return "AUTH_MASTER_REQUIRED";
  if (m.includes("SESSION_EXPIRED")) return "SESSION_EXPIRED";
  if (m.includes("STEP_UP") || m.includes("RE_AUTHENTICATE")) return "STEP_UP_REQUIRED";
  if (m.includes("INVALID_KEY") || m.includes("KEY_NAME")) return "VALIDATION_KEY_INVALID";
  if (m.includes("PAYLOAD_REQUIRED") || m.includes("NO_VALID") || m.includes("NO_VALID_KEY")) return "VALIDATION_PAYLOAD_EMPTY";
  if (m.includes("JSON")) return "VALIDATION_JSON_REQUIRED";
  // Check STORAGE_NOT_FOUND before KEY_NOT_FOUND since KEY_NOT_FOUND is a subset
  if (m.includes("NOT_FOUND") && (m.includes("SNAPSHOT") || m.includes("ENVIRONMENT"))) return "STORAGE_NOT_FOUND";
  if (m.includes("KEY_NOT_FOUND")) return "STORAGE_KEY_NOT_FOUND";
  if (m.includes("NOT_FOUND")) return "STORAGE_KEY_NOT_FOUND";
  if (m.includes("DECRYPTION") || m.includes("INVALID_KEY_OR_CORRUPTED")) return "STORAGE_DECRYPTION_FAILED";
  if (m.includes("TOO_MANY") || m.includes("RATE_LIMIT") || m.includes("429")) return "RATE_LIMIT_EXCEEDED";
  if (m.includes("INTERNAL") || m.includes("UNEXPECTED")) return "INTERNAL_ERROR";
  if (status === 401) return "AUTH_TOKEN_INVALID";
  if (status === 403) return "AUTH_NAMESPACE_FORBIDDEN";
  if (status === 404) return "STORAGE_NOT_FOUND";
  if (status === 429) return "RATE_LIMIT_EXCEEDED";
  if (status >= 500) return "INTERNAL_ERROR";
  return "VALIDATION_JSON_REQUIRED";
}

export function translateApiError(err: { message?: string; status?: number; body?: Record<string, unknown> }): UserError {
  const status = err.status ?? 0;
  const body = err.body ?? {};

  if (body?.code && typeof body.code === "string" && ERRORS[body.code]) {
    return ERRORS[body.code];
  }

  const detected = detectCode(String(err.message ?? ""), status);
  if (ERRORS[detected]) return ERRORS[detected];

  if (status === 0) {
    return { title: "Connection failed", description: "Could not reach the server.", suggestion: "Check your network connection.", severity: "error", code: "NETWORK_CONNECTION_FAILED" };
  }
  if (status >= 500) return ERRORS.INTERNAL_ERROR;
  return { title: "Request failed", description: err.message || "An unknown error occurred.", suggestion: "Try again or contact support.", severity: "error", code: detected };
}

export function formatUnknownError(err: unknown): UserError {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if ("title" in e && "description" in e && "severity" in e && "code" in e) return e as unknown as UserError;
    if ("status" in e && "message" in e) return translateApiError({ message: String(e.message), status: Number(e.status), body: (e.body as Record<string, unknown>) ?? {} });
  }
  const msg = err instanceof Error ? err.message : "An unexpected error occurred";
  return { title: "Something went wrong", description: msg, suggestion: "Try refreshing the page or contact support.", severity: "error", code: "INTERNAL_ERROR" };
}

/** Alias for backward compatibility */
export const formatUserError = formatUnknownError;

export function getErrorCode(err: { code?: string }): string {
  return err.code ?? "UNKNOWN";
}

export { ERRORS as errorCatalog };