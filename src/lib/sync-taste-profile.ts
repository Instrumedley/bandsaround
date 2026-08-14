import { buildTasteProfileFromSpotify } from "@/lib/build-taste-profile";
import { fetchSpotifyTopArtists } from "@/lib/spotify-top-artists";
import { ensureValidSpotifyAccessTokenForUser } from "@/lib/spotify-user-token";
import { saveTasteProfile } from "@/lib/taste-profile-store";
import type { TasteProfile } from "@/lib/taste-types";

export async function syncSpotifyTasteProfile(userId: string): Promise<TasteProfile> {
  const accessToken = await ensureValidSpotifyAccessTokenForUser(userId);
  if (!accessToken) {
    throw new Error("SPOTIFY_NOT_CONNECTED");
  }

  const spotifyArtists = await fetchSpotifyTopArtists(accessToken);
  const profile = buildTasteProfileFromSpotify(userId, spotifyArtists);
  await saveTasteProfile(profile);
  return profile;
}
