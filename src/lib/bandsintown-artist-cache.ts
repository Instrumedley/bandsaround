import { promises as fs } from "fs";
import path from "path";
import { normalizeArtistName } from "@/lib/normalize-artist-name";

export type CachedBandsintownArtist = {
  spotifyName: string;
  normalizedName: string;
  bandsintownName: string;
  bandsintownId: number;
  artistPageUrl: string;
  resolvedAt: string;
  lastError?: string;
  invalidatedAt?: string;
};

const storePath = path.join(process.cwd(), "data", "bandsintown-artists.json");

type StoreFile = Record<string, CachedBandsintownArtist>;

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

export async function getCachedBandsintownArtist(
  spotifyName: string,
): Promise<CachedBandsintownArtist | null> {
  const store = await readStore();
  const key = normalizeArtistName(spotifyName);
  const entry = store[key];
  if (!entry || entry.invalidatedAt) {
    return null;
  }
  return entry;
}

export async function saveCachedBandsintownArtist(entry: CachedBandsintownArtist): Promise<void> {
  const store = await readStore();
  store[entry.normalizedName] = {
    ...entry,
    invalidatedAt: undefined,
    lastError: undefined,
  };
  await writeStore(store);
}

export async function markCachedBandsintownArtistInvalid(spotifyName: string, error: string): Promise<void> {
  const store = await readStore();
  const key = normalizeArtistName(spotifyName);
  const existing = store[key];
  if (!existing) {
    return;
  }

  store[key] = {
    ...existing,
    invalidatedAt: new Date().toISOString(),
    lastError: error,
  };
  await writeStore(store);
}

export async function listCachedBandsintownArtists(): Promise<CachedBandsintownArtist[]> {
  const store = await readStore();
  return Object.values(store).filter((entry) => !entry.invalidatedAt);
}
