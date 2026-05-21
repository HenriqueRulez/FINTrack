interface RateLimitEntry {
  count: number;
  reset: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// In-memory store — resets on server restart
// Replace with Upstash Redis in v2 for multi-instance deployments
const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  limit: number = 20,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.reset) {
    store.set(identifier, { count: 1, reset: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.reset };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.reset };
}
