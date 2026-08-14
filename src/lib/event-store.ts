import { promises as fs } from "fs";
import path from "path";
import type { ArtistIngestionResult, EventIngestionProviderId } from "@/lib/ingestion/types";
import type { ConcertEvent } from "@/types/concert";

export type CachedArtistEvents = {
  artistName: string;
  normalizedName: string;
  events: ConcertEvent[];
  rawEventsCount: number;
  scrapedAt: string;
  error?: string;
};

export type StoredUserEvents = {
  userId: string;
  provider: EventIngestionProviderId;
  syncedAt: string;
  dateFrom: string;
  dateTo: string;
  artistsQueried: number;
  artistsWithEvents: number;
  rawEventsTotal?: number;
  events: ConcertEvent[];
  artistResults?: ArtistIngestionResult[];
  syncWarning?: string;
  artistEventsCache?: Record<string, CachedArtistEvents>;
};

const storePath = path.join(process.cwd(), "data", "user-events.json");

type StoreFile = Record<string, StoredUserEvents>;

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as StoreFile;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getUserEvents(userId: string): Promise<StoredUserEvents | null> {
  const store = await readStore();
  return store[userId] ?? null;
}

export async function saveUserEvents(record: StoredUserEvents): Promise<void> {
  const store = await readStore();
  store[record.userId] = record;
  await writeStore(store);
}

export async function mergeUserEventsUpdate(
  userId: string,
  update: Partial<StoredUserEvents> & {
    artistEventsCache?: Record<string, CachedArtistEvents>;
  },
): Promise<StoredUserEvents> {
  const store = await readStore();
  const existing = store[userId];
  const merged: StoredUserEvents = {
    userId,
    provider: "bandsintown-web",
    syncedAt: update.syncedAt ?? existing?.syncedAt ?? new Date().toISOString(),
    dateFrom: update.dateFrom ?? existing?.dateFrom ?? new Date().toISOString().slice(0, 10),
    dateTo: update.dateTo ?? existing?.dateTo ?? new Date().toISOString().slice(0, 10),
    artistsQueried: update.artistsQueried ?? existing?.artistsQueried ?? 0,
    artistsWithEvents: update.artistsWithEvents ?? existing?.artistsWithEvents ?? 0,
    rawEventsTotal: update.rawEventsTotal ?? existing?.rawEventsTotal ?? 0,
    events: update.events ?? existing?.events ?? [],
    artistResults: update.artistResults ?? existing?.artistResults,
    syncWarning: update.syncWarning ?? existing?.syncWarning,
    artistEventsCache: {
      ...(existing?.artistEventsCache ?? {}),
      ...(update.artistEventsCache ?? {}),
    },
  };

  store[userId] = merged;
  await writeStore(store);
  return merged;
}

function aggregateEventsFromCache(cache: Record<string, CachedArtistEvents> | undefined): ConcertEvent[] {
  if (!cache) {
    return [];
  }

  const byId = new Map<string, ConcertEvent>();
  for (const entry of Object.values(cache)) {
    for (const event of entry.events) {
      byId.set(event.id, event);
    }
  }

  return [...byId.values()].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
}

export function buildStoredEventsSummary(input: {
  artistEventsCache: Record<string, CachedArtistEvents>;
  dateFrom: string;
  dateTo: string;
  artistsQueried: number;
}): Pick<
  StoredUserEvents,
  "events" | "artistsWithEvents" | "rawEventsTotal" | "syncedAt"
> {
  const events = aggregateEventsFromCache(input.artistEventsCache);
  const artistsWithEvents = Object.values(input.artistEventsCache).filter(
    (entry) => entry.events.length > 0,
  ).length;
  const rawEventsTotal = Object.values(input.artistEventsCache).reduce(
    (sum, entry) => sum + entry.rawEventsCount,
    0,
  );

  return {
    events,
    artistsWithEvents,
    rawEventsTotal,
    syncedAt: new Date().toISOString(),
  };
}

export async function clearUserEvents(userId: string): Promise<void> {
  const store = await readStore();
  if (!(userId in store)) {
    return;
  }

  delete store[userId];
  await writeStore(store);
}
