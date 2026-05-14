/**
 * API base configuration for Secure Environment Manager.
 */

export const DEFAULT_BASE = "http://localhost:8070";

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BASE;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}