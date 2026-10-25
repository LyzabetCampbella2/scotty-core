// Scoped, short-lived login throttling. Never blocks for more than 30 seconds.
type RecordEntry = { count: number; startedAt: number; blockedUntil: number };
export function createLoginThrottle(
 now: () => number = Date.now,
 { maxFailures = 6, windowMs = 60_000, cooldownMs = 30_000 } = {}
) {
 const entries = new Map<string, RecordEntry>();
 function retryAfterSeconds(key: string): number {
  const entry = entries.get(key);
  if (!entry) return 0;
  const t = now();
  if (t < entry.blockedUntil) return Math.max(1, Math.ceil((entry.blockedUntil - t) / 1000));
  if (t - entry.startedAt >= windowMs) entries.delete(key);
  return 0;
 }
 function failed(key: string): number {
  const t = now(), previous = entries.get(key);
  const current = previous && t - previous.startedAt < windowMs ? previous : null;
  const count = (current?.count ?? 0) + 1;
  entries.set(key, {
   count,
   startedAt: current?.startedAt ?? t,
   blockedUntil: count >= maxFailures ? t + cooldownMs : 0
  });
  return count >= maxFailures ? Math.ceil(cooldownMs / 1000) : 0;
 }
 function cleared(key: string) { entries.delete(key) }
 return { retryAfterSeconds, failed, cleared };
}
