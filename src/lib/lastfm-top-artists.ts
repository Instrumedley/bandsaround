import type { LastFmArtistTasteRow } from "@/lib/taste-types";

type LastFmArtistNode = {
  name?: string;
  playcount?: string;
};

type LastFmTopArtistsJson = {
  topartists?: {
    artist?: LastFmArtistNode | LastFmArtistNode[];
  };
  error?: number;
  message?: string;
};

function normalizeArtistList(artist: LastFmArtistNode | LastFmArtistNode[] | undefined): LastFmArtistNode[] {
  if (!artist) {
    return [];
  }
  return Array.isArray(artist) ? artist : [artist];
}

/**
 * Fetches up to 500 top artists for the public profile (overall period). Playcount is Last.fm scrobbles.
 */
export async function fetchLastFmTopArtists(username: string): Promise<LastFmArtistTasteRow[]> {
  const apiKey = process.env.LASTFM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("LASTFM_API_KEY is not configured.");
  }

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "user.getTopArtists");
  url.searchParams.set("user", username);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "500");
  url.searchParams.set("page", "1");
  url.searchParams.set("period", "overall");

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Last.fm top artists failed: ${response.status} ${text}`);
  }

  const json: unknown = await response.json();
  const record = json as LastFmTopArtistsJson;

  if (record.error) {
    throw new Error(record.message ?? `Last.fm error ${String(record.error)}`);
  }

  const list = normalizeArtistList(record.topartists?.artist);
  const rows: LastFmArtistTasteRow[] = [];

  let rank = 1;
  for (const node of list) {
    if (rows.length >= 500) {
      break;
    }
    const name = node.name?.trim();
    if (!name) {
      continue;
    }
    const playcountRaw = node.playcount ?? "0";
    const scrobbles = Number.parseInt(playcountRaw, 10);
    rows.push({
      rank,
      name,
      scrobbles: Number.isFinite(scrobbles) ? scrobbles : 0,
    });
    rank += 1;
  }

  return rows;
}
