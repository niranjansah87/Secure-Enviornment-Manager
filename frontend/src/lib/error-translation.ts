/**
 * Centralized error translation for Secure Environment Manager.
 * Maps backend error codes/categories to user-friendly messages.
 * Includes recovery suggestions for each error type.
 */

export type UserFriendlyError = {
  title: string;
  description: string;
  suggestion?: string;
  severity: "info" | "warning" | "error" | "critical";
  code?: string;
};



const ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  // Auth errors (401, 403)
  AUTH_TOKEN_MISSING: {
    title: "Authentication required",
    description: "Your request does not include an API token.",
    suggestion: "Add your API token in Settings and try again.",
    severity: "error",
    code: "AUTH_TOKEN_MISSING",
  },
  AUTH_TOKEN_INVALID: {
    title: "Invalid API token",
    description: "The API token you provided is not valid or has been revoked.",
    suggestion: "Check your API token in Settings, or generate a new one.",
    severity: "error",
    code: "AUTH_TOKEN_INVALID",
  },
  AUTH_NAMESPACE_FORBIDDEN: {
    title: "Access denied",
    description: "Your API token does not have access to this namespace.",
    suggestion: "Contact your administrator to get access to this namespace.",
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

  // Session errors
  SESSION_EXPIRED: {
    title: "Session expired",
    description: "Your session has expired due to inactivity or the absolute time limit was reached.",
    suggestion: "Log in again to continue working.",
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

  // Validation errors (400)
  VALIDATION_KEY_INVALID: {
    title: "Invalid variable name",
    description: "The variable key contains disallowed characters or is too long.",
    suggestion: "Use only letters, numbers, underscores, dots, and hyphens (max 128 chars).",
    severity: "error",
    code: "VALIDATION_KEY_INVALID",
  },
  VALIDATION_PAYLOAD_EMPTY: {
    title: "No valid entries",
    description: "The data you submitted contains no valid key-value pairs.",
    suggestion: "Make sure each line follows the format: KEY=value",
    severity: "warning",
    code: "VALIDATION_PAYLOAD_EMPTY",
  },
  VALIDATION_JSON_REQUIRED: {
    title: "Invalid request format",
    description: "The request body must be a valid JSON object.",
    suggestion: "Check that your request is properly formatted and try again.",
    severity: "error",
    code: "VALIDATION_JSON_REQUIRED",
  },

  // Storage errors
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

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: {
    title: "Too many requests",
    description: "You have made too many requests in a short time period.",
    suggestion: "Wait a moment and try again. Consider reducing request frequency.",
    severity: "warning",
    code: "RATE_LIMIT_EXCEEDED",
  },

  // Network errors
  NETWORK_CONNECTION_FAILED: {
    title: "Connection failed",
    description: "Could not connect to the server.",
    suggestion: "Check your internet connection and try again.",
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

  // Internal errors (500)
  INTERNAL_ERROR: {
    title: "Something went wrong",
    description: "An unexpected error occurred on the server.",
    suggestion: "Try again in a few moments. If the problem persists, contact support.",
    severity: "error",
    code: "INTERNAL_ERROR",
  },
  INTERNAL_STORAGE_ERROR: {
    title: "Storage error",
    description: "Failed to save your data.",
    suggestion: "Try again. If the problem persists, contact your administrator.",
    severity: "error",
    code: "INTERNAL_STORAGE_ERROR",
  },

  // Lockout
  AUTH_LOCKED_OUT: {
    title: "Account locked",
    description: "Too many failed login attempts. Your account is temporarily locked.",
    suggestion: "Wait a few minutes before trying again, or contact your administrator.",
    severity: "critical",
    code: "AUTH_LOCKED_OUT",
  },
};

/**
 * Detect error code from response body or status.
 */
function detectErrorCode(body: Record<string, unknown>, status: number): string {
  if (body?.error) {
    const msg = String(body.error).toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (msg.includes("TOKEN_MISSING") || msg.includes("AUTHORIZATION_HEADER_MISSING")) {
      return "AUTH_TOKEN_MISSING";
    }
    if (msg.includes("INVALID_API_KEY") || msg.includes("INVALID_TOKEN") || msg.includes("TOKEN_INVALID")) {
      return "AUTH_TOKEN_INVALID";
    }
    if (msg.includes("FORBIDDEN") || msg.includes("NOT_ALLOWED")) {
      return "AUTH_NAMESPACE_FORBIDDEN";
    }
    if (msg.includes("MASTER_REQUIRED") || msg.includes("ADMINISTRATIVE")) {
      return "AUTH_MASTER_REQUIRED";
    }
    if (msg.includes("SESSION_EXPIRED")) {
      return "SESSION_EXPIRED";
    }
    if (msg.includes("STEP_UP") || msg.includes("RE_AUTHENTICATE")) {
      return "STEP_UP_REQUIRED";
    }
    if (msg.includes("INVALID_KEY") || msg.includes("KEY_NAME")) {
      return "VALIDATION_KEY_INVALID";
    }
    if (msg.includes("PAYLOAD_REQUIRED") || msg.includes("NO_VALID")) {
      return "VALIDATION_PAYLOAD_EMPTY";
    }
    if (msg.includes("JSON")) {
      return "VALIDATION_JSON_REQUIRED";
    }
    if (msg.includes("NOT_FOUND") && (msg.includes("SNAPSHOT") || msg.includes("ENVIRONMENT"))) {
      return "STORAGE_NOT_FOUND";
    }
    if (msg.includes("KEY_NOT_FOUND") || msg.includes("NOT_FOUND")) {
      return "STORAGE_KEY_NOT_FOUND";
    }
    if (msg.includes("DECRYPTION") || msg.includes("INVALID_KEY_OR_CORRUPTED")) {
      return "STORAGE_DECRYPTION_FAILED";
    }
    if (msg.includes("TOO_MANY") || msg.includes("RATE_LIMIT") || msg.includes("429")) {
      return "RATE_LIMIT_EXCEEDED";
    }
    if (msg.includes("INTERNAL") || msg.includes("UNEXPECTED")) {
      return "INTERNAL_ERROR";
    }
  }

  if (status === 401) return "AUTH_TOKEN_INVALID";
  if (status === 403) return "AUTH_NAMESPACE_FORBIDDEN";
  if (status === 404) return "STORAGE_NOT_FOUND";
  if (status === 429) return "RATE_LIMIT_EXCEEDED";
  if (status >= 500) return "INTERNAL_ERROR";

  return "VALIDATION_JSON_REQUIRED";
}

/**
 * Translate an API error (from api.ts) to a user-friendly message.
 */
export function translateError(error: {
  message?: string;
  status?: number;
  body?: Record<string, unknown>;
}): UserFriendlyError {
  const status = error.status ?? 0;
  const body = error.body ?? {};

  // Check for explicit code in body
  if (body?.code && typeof body.code === "string") {
    const known = ERROR_MESSAGES[body.code];
    if (known) return known;
  }

  // Detect from response body
  const detectedCode = detectErrorCode(body, status);
  const known = ERROR_MESSAGES[detectedCode];
  if (known) return known;

  // Fallback based on status
  if (status === 0) {
    return {
      title: "Connection failed",
      description: "Could not reach the server.",
      suggestion: "Check your network connection and try again.",
      severity: "error",
      code: "NETWORK_CONNECTION_FAILED",
    };
  }

  if (status >= 500) {
    return ERROR_MESSAGES.INTERNAL_ERROR;
  }

  // Generic fallback
  return {
    title: "Request failed",
    description: error.message || "An unknown error occurred.",
    suggestion: "Try again or contact support if the problem persists.",
    severity: "error",
    code: detectedCode,
  };
}

/**
 * Get a user-friendly title for an HTTP status code.
 */
export function statusToTitle(status: number): string {
  if (status === 400) return "Bad request";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not found";
  if (status === 429) return "Too many requests";
  if (status === 500) return "Server error";
  if (status === 502) return "Bad gateway";
  if (status === 503) return "Service unavailable";
  return `Error ${status}`;
}

/**
 * Format a raw error for display in the UI.
 * Returns a UserFriendlyError ready for toast/alert display.
 */
export function formatUserError(err: unknown): UserFriendlyError {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;

    // Already translated?
    if ("title" in e && "description" in e) {
      return e as UserFriendlyError;
    }

    // Known ApiError structure
    if ("status" in e && "message" in e) {
      return translateError({
        message: String(e.message),
        status: Number(e.status),
        body: (e.body as Record<string, unknown>) ?? {},
      });
    }
  }

  // Fallback for unknown error types
  const message = err instanceof Error ? err.message : "An unexpected error occurred";
  return {
    title: "Something went wrong",
    description: message,
    suggestion: "Try refreshing the page or contact support.",
    severity: "error",
  };
}