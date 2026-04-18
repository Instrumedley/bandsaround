import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { clearLastFmIntegration } from "@/lib/integration-store";

export async function POST() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", getAppBaseUrl()));
  }

  await clearLastFmIntegration(session.user.id);
  return NextResponse.redirect(new URL("/settings?lastfm=disconnected", getAppBaseUrl()));
}
