import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { setSpotifyIntegration } from "@/lib/integration-store";
import { verifyOAuthState } from "@/lib/oauth-state";
import { exchangeSpotifyAuthorizationCode, fetchSpotifyProfile } from "@/lib/spotify-token";

export async function GET(request: Request) {
  const base = getAppBaseUrl();
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?spotify=error&spotify_reason=${encodeURIComponent(error)}`, base),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?spotify=error&spotify_reason=missing_code", base),
    );
  }

  const userId = verifyOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(
      new URL("/settings?spotify=error&spotify_reason=invalid_state", base),
    );
  }

  try {
    const token = await exchangeSpotifyAuthorizationCode(code);
    const profile = await fetchSpotifyProfile(token.access_token);
    const expiresAtMs = Date.now() + token.expires_in * 1000;

    if (!token.refresh_token) {
      return NextResponse.redirect(
        new URL("/settings?spotify=error&spotify_reason=missing_refresh_token", base),
      );
    }

    await setSpotifyIntegration(userId, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAtMs,
      spotifyUserId: profile.id,
      displayName: profile.display_name,
    });

    return NextResponse.redirect(new URL("/settings?spotify=connected", base));
  } catch {
    return NextResponse.redirect(
      new URL("/settings?spotify=error&spotify_reason=token_exchange", base),
    );
  }
}
