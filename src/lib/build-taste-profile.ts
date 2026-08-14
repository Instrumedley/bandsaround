import { normalizeArtistName } from "@/lib/normalize-artist-name";
import type { SpotifyArtistTasteRow, TasteProfile, TasteProfileArtist } from "@/lib/taste-types";
import { TASTE_PROFILE_MAX_ARTISTS } from "@/lib/taste-types";

export function buildTasteProfileFromSpotify(
  userId: string,
  spotifyArtists: SpotifyArtistTasteRow[],
): TasteProfile {
  const seen = new Set<string>();
  const artists: TasteProfileArtist[] = [];

  for (const row of spotifyArtists) {
    const normalizedName = normalizeArtistName(row.name);
    if (!normalizedName || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    artists.push({
      rank: artists.length + 1,
      name: row.name,
      normalizedName,
      source: "spotify",
      popularity: row.popularity,
      genres: row.genres,
    });

    if (artists.length >= TASTE_PROFILE_MAX_ARTISTS) {
      break;
    }
  }

  return {
    userId,
    artists,
    sourceSummary: {
      spotify: artists.length,
    },
    syncedAt: new Date().toISOString(),
  };
}
