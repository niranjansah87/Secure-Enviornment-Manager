/**
 * Redis key-namespace helpers.
 * All Redis keys are explicitly prefixed with sem: + namespace.
 * Never allow user-controlled strings to reach the key directly.
 */
export const RedisKeys = {
  // Rate limiting
  rateLimitLogin: (ip: string) => `sem:rate:login:${sanitize(ip)}`,
  rateLimitRefresh: (ip: string) => `sem:rate:refresh:${sanitize(ip)}`,
  rateLimitApiKey: (prefix: string) => `sem:rate:apikey:${sanitize(prefix)}`,
  rateLimitExport: (userId: string) => `sem:rate:export:${sanitize(userId)}`,
  rateLimitRemote: (ip: string, envId: string) => `sem:rate:remote:${sanitize(ip)}:${sanitize(envId)}`,

  // Session cache (metadata only, not secret values)
  sessionCache: (sessionId: string) => `sem:session:${sanitize(sessionId)}`,

  // Socket.IO adapter
  socketRoom: (roomType: string, id: string) => `sem:socket:${sanitize(roomType)}:${sanitize(id)}`,
} as const;

/** Strip characters that could inject Redis commands or manipulate key structure. */
function sanitize(value: string): string {
  // Only allow alphanumerics, hyphens, dots, underscores, colons
  return value.replace(/[^a-zA-Z0-9\-._:]/g, '_');
}
