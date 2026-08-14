import { promises as fs } from "fs";
import path from "path";

export type SyncLogLevel = "info" | "warn" | "error";

export type SyncLogEntry = {
  at: string;
  level: SyncLogLevel;
  message: string;
};

export type EventSyncPhase = "resolve" | "events" | "done";

export type EventSyncMode = "resolve-urls" | "refresh-events";

export type EventSyncJob = {
  userId: string;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  mode: EventSyncMode;
  phase: EventSyncPhase;
  startedAt: string;
  updatedAt: string;
  totalArtists: number;
  resolveCursor: number;
  eventsCursor: number;
  artistsResolved: number;
  artistsScraped: number;
  eventsFound: number;
  forceRefresh: boolean;
  logs: SyncLogEntry[];
  error?: string;
};

const storePath = path.join(process.cwd(), "data", "event-sync-jobs.json");
const MAX_LOGS = 100;

type StoreFile = Record<string, EventSyncJob>;

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

export async function getEventSyncJob(userId: string): Promise<EventSyncJob | null> {
  const store = await readStore();
  return store[userId] ?? null;
}

export async function saveEventSyncJob(job: EventSyncJob): Promise<void> {
  const store = await readStore();
  store[job.userId] = job;
  await writeStore(store);
}

export function appendSyncLog(
  job: EventSyncJob,
  level: SyncLogLevel,
  message: string,
): EventSyncJob {
  const entry: SyncLogEntry = {
    at: new Date().toISOString(),
    level,
    message,
  };

  return {
    ...job,
    updatedAt: entry.at,
    logs: [...job.logs, entry].slice(-MAX_LOGS),
  };
}
