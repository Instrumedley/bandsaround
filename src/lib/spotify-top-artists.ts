import type { SpotifyArtistTasteRow } from "@/lib/taste-types";

const MAX_ARTISTS = 500;
const PAGE_SIZE = 50;

function formatGenres(genres: string[]): string {
  if (genres.length === 0) {
    return "—";
  }
  const joined = genres.slice(0, 4).join(", ");
  return genres.length > 4 ? `${joined}…` : joined;
}

type SpotifyTopArtistsApiItem = {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
};

type SpotifyTopArtistsResponse = {
  items: SpotifyTopArtistsApiItem[];
};

function parseTopArtistsResponse(json: unknown): SpotifyTopArtistsResponse {
  if (!json || typeof json !== "object" || !("items" in json)) {
    throw new Error("Unexpected Spotify top artists response shape.");
  }
  const items = (json as { items: unknown }).items;
  if (!Array.isArray(items)) {
    throw new Error("Spotify top artists items was not an array.");
  }
  return { items: items as SpotifyTopArtistsApiItem[] };
}

/**
 * Fetches up to 500 top artists (long-term affinity). Spotify does not expose per-artist play counts;
 * order reflects listening-derived affinity. Includes catalog popularity (0–100) and genres.
 */
export async function fetchSpotifyTopArtists(accessToken: string): Promise<SpotifyArtistTasteRow[]> {
  const rows: SpotifyArtistTasteRow[] = [];
  let rank = 1;

  for (let offset = 0; offset < MAX_ARTISTS; offset += PAGE_SIZE) {
    const url = new URL("https://api.spotify.com/v1/me/top/artists");
    url.searchParams.set("time_range", "long_term");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (offset > 0 && rows.length > 0) {
        break;
      }
      const text = await response.text();
      throw new Error(`Spotify top artists failed: ${response.status} ${text}`);
    }

    const json: unknown = await response.json();
    const parsed = parseTopArtistsResponse(json);

    if (parsed.items.length === 0) {
      break;
    }

    for (const item of parsed.items) {
      if (rows.length >= MAX_ARTISTS) {
        return rows;
      }
      rows.push({
        rank,
        name: item.name,
        popularity: item.popularity,
        genres: formatGenres(item.genres ?? []),
      });
      rank += 1;
    }

    if (parsed.items.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}
