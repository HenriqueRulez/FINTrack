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

// Purge de entradas expiradas (B-03): sem isto o Map cresce indefinidamente
// à medida que aparecem novas chaves (ex.: novos user.id). Varre no máximo
// uma vez por PURGE_INTERVAL_MS para não percorrer o Map a cada chamada.
const PURGE_INTERVAL_MS = 60_000;
let lastPurge = 0;

function purgeExpired(now: number): void {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  for (const [key, entry] of store) {
    if (now > entry.reset) store.delete(key);
  }
}

export function rateLimit(
  identifier: string,
  limit: number = 20,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  purgeExpired(now);
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
