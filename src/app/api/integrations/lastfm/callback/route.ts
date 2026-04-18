import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { setLastFmIntegration } from "@/lib/integration-store";
import { fetchLastFmSession } from "@/lib/lastfm-auth";
import { verifyOAuthState } from "@/lib/oauth-state";

export async function GET(request: Request) {
  const base = getAppBaseUrl();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const state = searchParams.get("state");

  if (!token) {
    return NextResponse.redirect(
      new URL("/settings?lastfm=error&lastfm_reason=missing_token", base),
    );
  }

  const userId = verifyOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(
      new URL("/settings?lastfm=error&lastfm_reason=invalid_state", base),
    );
  }

  try {
    const session = await fetchLastFmSession(token);
    await setLastFmIntegration(userId, {
      username: session.session.name,
      sessionKey: session.session.key,
    });

    return NextResponse.redirect(new URL("/settings?lastfm=connected", base));
  } catch {
    return NextResponse.redirect(
      new URL("/settings?lastfm=error&lastfm_reason=session", base),
    );
  }
}
