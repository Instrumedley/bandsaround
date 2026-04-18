import { promises as fs } from "fs";
import path from "path";

export type SpotifyIntegration = {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
  spotifyUserId: string;
  displayName?: string;
};

export type LastFmIntegration = {
  username: string;
  sessionKey: string;
};

export type UserIntegrations = {
  spotify?: SpotifyIntegration;
  lastfm?: LastFmIntegration;
};

const storePath = path.join(process.cwd(), "data", "user-integrations.json");

type StoreFile = Record<string, UserIntegrations>;

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

export async function getIntegrations(userId: string): Promise<UserIntegrations> {
  const store = await readStore();
  return store[userId] ?? {};
}

export async function setSpotifyIntegration(
  userId: string,
  spotify: SpotifyIntegration,
): Promise<void> {
  const store = await readStore();
  const current = store[userId] ?? {};
  store[userId] = { ...current, spotify };
  await writeStore(store);
}

export async function setLastFmIntegration(
  userId: string,
  lastfm: LastFmIntegration,
): Promise<void> {
  const store = await readStore();
  const current = store[userId] ?? {};
  store[userId] = { ...current, lastfm };
  await writeStore(store);
}

export async function clearSpotifyIntegration(userId: string): Promise<void> {
  const store = await readStore();
  const current = store[userId];
  if (!current?.spotify) {
    return;
  }

  const next: UserIntegrations = { ...current };
  delete next.spotify;

  if (!next.lastfm) {
    delete store[userId];
  } else {
    store[userId] = next;
  }

  await writeStore(store);
}

export async function clearLastFmIntegration(userId: string): Promise<void> {
  const store = await readStore();
  const current = store[userId];
  if (!current?.lastfm) {
    return;
  }

  const next: UserIntegrations = { ...current };
  delete next.lastfm;

  if (!next.spotify) {
    delete store[userId];
  } else {
    store[userId] = next;
  }

  await writeStore(store);
}
