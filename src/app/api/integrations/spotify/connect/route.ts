import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", getAppBaseUrl()));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL("/settings?spotify=config_error", getAppBaseUrl()),
    );
  }

  const state = createOAuthState(session.user.id);
  const scopes = ["user-read-email", "user-top-read"].join(" ");

  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", scopes);
  authorize.searchParams.set("state", state);

  return NextResponse.redirect(authorize.toString());
}
