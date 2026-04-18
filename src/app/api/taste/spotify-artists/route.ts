import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { fetchSpotifyTopArtists } from "@/lib/spotify-top-artists";
import { ensureValidSpotifyAccessTokenForUser } from "@/lib/spotify-user-token";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await ensureValidSpotifyAccessTokenForUser(session.user.id);
  if (!accessToken) {
    return NextResponse.json({ error: "spotify_not_connected" }, { status: 400 });
  }

  try {
    const artists = await fetchSpotifyTopArtists(accessToken);
    return NextResponse.json({ artists });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
