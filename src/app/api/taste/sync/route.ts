import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { syncSpotifyTasteProfile } from "@/lib/sync-taste-profile";

export async function POST() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", getAppBaseUrl()));
  }

  try {
    await syncSpotifyTasteProfile(session.user.id);
    return NextResponse.redirect(new URL("/settings?taste=synced", getAppBaseUrl()));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "sync_failed";
    return NextResponse.redirect(
      new URL(`/settings?taste=error&taste_reason=${encodeURIComponent(reason)}`, getAppBaseUrl()),
    );
  }
}
