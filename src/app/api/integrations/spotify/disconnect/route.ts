import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { clearSpotifyIntegration } from "@/lib/integration-store";

export async function POST() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", getAppBaseUrl()));
  }

  await clearSpotifyIntegration(session.user.id);
  return NextResponse.redirect(new URL("/settings?spotify=disconnected", getAppBaseUrl()));
}
