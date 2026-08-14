import { promises as fs } from "fs";
import path from "path";
import type { TasteProfile } from "@/lib/taste-types";

const storePath = path.join(process.cwd(), "data", "taste-profiles.json");

type StoreFile = Record<string, TasteProfile>;

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

export async function getTasteProfile(userId: string): Promise<TasteProfile | null> {
  const store = await readStore();
  return store[userId] ?? null;
}

export async function saveTasteProfile(profile: TasteProfile): Promise<void> {
  const store = await readStore();
  store[profile.userId] = profile;
  await writeStore(store);
}

export async function clearTasteProfile(userId: string): Promise<void> {
  const store = await readStore();
  if (!(userId in store)) {
    return;
  }

  delete store[userId];
  await writeStore(store);
}
