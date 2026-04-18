import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getIntegrations } from "@/lib/integration-store";
import { fetchLastFmTopArtists } from "@/lib/lastfm-top-artists";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastfm = (await getIntegrations(session.user.id)).lastfm;
  if (!lastfm) {
    return NextResponse.json({ error: "lastfm_not_connected" }, { status: 400 });
  }

  try {
    const artists = await fetchLastFmTopArtists(lastfm.username);
    return NextResponse.json({ artists });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
