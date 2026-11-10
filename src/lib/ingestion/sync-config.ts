export const SYNC_RESOLVE_BATCH_SIZE = 1;
export const SYNC_EVENTS_BATCH_SIZE = 1;
/** Per-artist tour cache: re-scrape only after this many days (unless force refresh). */
export const EVENTS_STALE_DAYS = 30;
export const CLOUDFLARE_RETRY_DELAYS_MS = [90_000, 180_000] as const;
export const SEARCH_DELAY_MS_MIN = 4_000;
export const SEARCH_DELAY_MS_MAX = 8_000;
export const EVENTS_BATCH_DELAY_MS_MIN = 6_000;
export const EVENTS_BATCH_DELAY_MS_MAX = 12_000;

export function randomDelayMs(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
