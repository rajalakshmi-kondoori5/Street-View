import { createHash, timingSafeEqual } from 'node:crypto';

/** Constant-time comparison (hashing first makes the lengths equal). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** True when `presented` is the secret registered for this bin. */
export function isValidDeviceKey(keys: Map<string, string>, binId: string, presented: string | undefined): boolean {
  const expected = keys.get(binId);
  if (!expected || !presented) return false;
  return safeEqual(expected, presented);
}

/** Simple per-bin rate limit so a faulty device can't flood the database. */
export function createRateLimiter(minIntervalMs: number, now: () => number = Date.now) {
  const last = new Map<string, number>();
  return (key: string): boolean => {
    const t = now();
    const prev = last.get(key);
    if (prev !== undefined && t - prev < minIntervalMs) return false;
    last.set(key, t);
    return true;
  };
}
