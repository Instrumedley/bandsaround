export type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

export async function exchangeSpotifyAuthorizationCode(code: string): Promise<SpotifyTokenResponse> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Spotify OAuth environment variables are not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token exchange failed: ${response.status} ${text}`);
  }

  const json: unknown = await response.json();
  if (!json || typeof json !== "object") {
    throw new Error("Spotify token response was not valid JSON.");
  }

  return json as SpotifyTokenResponse;
}

type SpotifyProfile = {
  id: string;
  display_name?: string;
};

export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfile> {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify profile fetch failed: ${response.status} ${text}`);
  }

  const json: unknown = await response.json();
  if (!json || typeof json !== "object" || !("id" in json)) {
    throw new Error("Spotify profile response was invalid.");
  }

  return json as SpotifyProfile;
}

export async function refreshSpotifyAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify OAuth environment variables are not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token refresh failed: ${response.status} ${text}`);
  }

  const json: unknown = await response.json();
  if (!json || typeof json !== "object") {
    throw new Error("Spotify refresh response was not valid JSON.");
  }

  return json as SpotifyTokenResponse;
}
