import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", getAppBaseUrl()));
  }

  const apiKey = process.env.LASTFM_API_KEY?.trim();
  const callbackBase = process.env.LASTFM_REDIRECT_URI?.trim();

  if (!apiKey || !callbackBase) {
    return NextResponse.redirect(
      new URL("/settings?lastfm=config_error", getAppBaseUrl()),
    );
  }

  const state = createOAuthState(session.user.id);
  const callback = new URL(callbackBase);
  callback.searchParams.set("state", state);

  const authorize = new URL("https://www.last.fm/api/auth/");
  authorize.searchParams.set("api_key", apiKey);
  authorize.searchParams.set("cb", callback.toString());

  return NextResponse.redirect(authorize.toString());
}
