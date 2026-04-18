"use client";

import { useEffect, useState } from "react";
import { PaginatedArtistsTable } from "@/components/taste/paginated-artists-table";

type SpotifyArtistPayload = {
  rank: number;
  name: string;
  popularity: number;
  genres: string;
};

function parseSpotifyPayload(json: unknown): SpotifyArtistPayload[] {
  if (!json || typeof json !== "object" || !("artists" in json)) {
    throw new Error("Invalid response from server.");
  }
  const artists = (json as { artists?: unknown }).artists;
  if (!Array.isArray(artists)) {
    throw new Error("Invalid artists list.");
  }

  const out: SpotifyArtistPayload[] = [];
  for (let i = 0; i < artists.length; i += 1) {
    const item = artists[i];
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : "Unknown";
    const rank = typeof o.rank === "number" ? o.rank : i + 1;
    const popularity = typeof o.popularity === "number" ? o.popularity : 0;
    const genres = typeof o.genres === "string" ? o.genres : "—";
    out.push({ rank, name, popularity, genres });
  }
  return out;
}

export function SpotifyArtistsPanel() {
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/taste/spotify-artists");
        const json: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof json === "object" && json !== null && "error" in json
              ? String((json as { error: unknown }).error)
              : "Failed to load Spotify artists.";
          throw new Error(msg);
        }
        const artistRows = parseSpotifyPayload(json);
        if (!cancelled) {
          setRows(
            artistRows.map((r) => ({
              rank: r.rank,
              name: r.name,
              popularity: r.popularity,
              genres: r.genres,
            })),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PaginatedArtistsTable
      title="Artists retrieved from Spotify"
      description="Long-term top artists (most affinity first). Up to 500 artists."
      footnote="Spotify does not expose per-artist play counts in this API. Order is Spotify’s affinity ranking; “Popularity” is a catalog score (0–100), not your listens."
      columns={[
        { key: "rank", label: "#" },
        { key: "name", label: "Artist" },
        { key: "popularity", label: "Popularity", align: "right" },
        { key: "genres", label: "Genres" },
      ]}
      rows={rows}
      pageSize={50}
      loading={loading}
      error={error}
    />
  );
}
