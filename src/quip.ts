// Picks a quip from a pool. "Anti-repeat" = avoid immediately repeating the last line
// when there is an alternative. rng is injectable so tests are deterministic.

export function selectQuip(
  pool: string[],
  lastText?: string,
  rng: () => number = Math.random,
): string {
  if (!pool || pool.length === 0) return "";
  if (pool.length === 1) return pool[0]!;
  const candidates = lastText ? pool.filter((q) => q !== lastText) : pool;
  const arr = candidates.length ? candidates : pool;
  return arr[Math.floor(rng() * arr.length)]!;
}
