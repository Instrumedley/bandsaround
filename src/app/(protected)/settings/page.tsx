import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { LastFmArtistsPanel } from "@/components/taste/lastfm-artists-panel";
import { SpotifyArtistsPanel } from "@/components/taste/spotify-artists-panel";
import { getIntegrations } from "@/lib/integration-store";

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const integrations = await getIntegrations(session.user.id);

  const spotifyStatus = firstParam(params.spotify);
  const lastfmStatus = firstParam(params.lastfm);
  const spotifyReason = firstParam(params.spotify_reason);
  const lastfmReason = firstParam(params.lastfm_reason);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold">Account Settings</h1>
      <p className="mt-2 text-sm text-slate-300">
        Connect Spotify and Last.fm to import your listening profile. After linking, your top artists
        appear below each service for a quick taste check.
      </p>

      {spotifyStatus === "connected" ? (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Spotify connected successfully.
        </p>
      ) : null}
      {spotifyStatus === "disconnected" ? (
        <p className="mt-4 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200">
          Spotify disconnected.
        </p>
      ) : null}
      {spotifyStatus === "error" ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          Spotify connection failed
          {spotifyReason ? `: ${spotifyReason}` : "."}
        </p>
      ) : null}
      {spotifyStatus === "config_error" ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Spotify OAuth is not configured. Add SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and
          SPOTIFY_REDIRECT_URI to <code className="text-amber-50">.env.local</code>.
        </p>
      ) : null}

      {lastfmStatus === "connected" ? (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Last.fm connected successfully.
        </p>
      ) : null}
      {lastfmStatus === "disconnected" ? (
        <p className="mt-4 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200">
          Last.fm disconnected.
        </p>
      ) : null}
      {lastfmStatus === "error" ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          Last.fm connection failed
          {lastfmReason ? `: ${lastfmReason}` : "."}
        </p>
      ) : null}
      {lastfmStatus === "config_error" ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Last.fm API is not configured. Add LASTFM_API_KEY, LASTFM_API_SECRET, and LASTFM_REDIRECT_URI to{" "}
          <code className="text-amber-50">.env.local</code>.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Spotify</h2>
          {integrations.spotify ? (
            <>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>
                  Connected as{" "}
                  <span className="font-medium text-slate-100">
                    {integrations.spotify.displayName ?? integrations.spotify.spotifyUserId}
                  </span>
                </p>
                <form action="/api/integrations/spotify/disconnect" method="post">
                  <button
                    type="submit"
                    className="rounded-md border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/25"
                  >
                    Disconnect Spotify
                  </button>
                </form>
              </div>
              <SpotifyArtistsPanel />
            </>
          ) : (
            <div className="mt-3">
              <Link
                href="/api/integrations/spotify/connect"
                className="inline-flex rounded-md border border-emerald-500/50 bg-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-600/30"
              >
                Connect Spotify
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Last.fm</h2>
          {integrations.lastfm ? (
            <>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>
                  Connected as{" "}
                  <span className="font-medium text-slate-100">{integrations.lastfm.username}</span>
                </p>
                <form action="/api/integrations/lastfm/disconnect" method="post">
                  <button
                    type="submit"
                    className="rounded-md border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/25"
                  >
                    Disconnect Last.fm
                  </button>
                </form>
              </div>
              <LastFmArtistsPanel />
            </>
          ) : (
            <div className="mt-3">
              <Link
                href="/api/integrations/lastfm/connect"
                className="inline-flex rounded-md border border-red-500/40 bg-red-600/15 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-600/25"
              >
                Connect Last.fm
              </Link>
            </div>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Tokens are stored locally in <code className="text-slate-400">data/user-integrations.json</code>{" "}
        for development. Use a secrets manager and database in production.
      </p>
    </section>
  );
}
