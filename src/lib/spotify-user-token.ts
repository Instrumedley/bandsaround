import { getIntegrations, setSpotifyIntegration } from "@/lib/integration-store";
import { refreshSpotifyAccessToken } from "@/lib/spotify-token";

const TOKEN_SKEW_MS = 60_000;

/**
 * Returns a valid Spotify access token for the user, refreshing and persisting when needed.
 */
export async function ensureValidSpotifyAccessTokenForUser(userId: string): Promise<string | null> {
  const integration = (await getIntegrations(userId)).spotify;
  if (!integration) {
    return null;
  }

  const now = Date.now();
  if (integration.expiresAtMs > now + TOKEN_SKEW_MS) {
    return integration.accessToken;
  }

  const refreshed = await refreshSpotifyAccessToken(integration.refreshToken);
  const expiresAtMs = now + refreshed.expires_in * 1000;

  await setSpotifyIntegration(userId, {
    ...integration,
    accessToken: refreshed.access_token,
    expiresAtMs,
    refreshToken: refreshed.refresh_token ?? integration.refreshToken,
  });

  return refreshed.access_token;
}
