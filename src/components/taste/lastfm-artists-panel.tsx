"use client";

import { useEffect, useState } from "react";
import { PaginatedArtistsTable } from "@/components/taste/paginated-artists-table";

type LastFmArtistPayload = {
  rank: number;
  name: string;
  scrobbles: number;
};

function parseLastFmPayload(json: unknown): LastFmArtistPayload[] {
  if (!json || typeof json !== "object" || !("artists" in json)) {
    throw new Error("Invalid response from server.");
  }
  const artists = (json as { artists?: unknown }).artists;
  if (!Array.isArray(artists)) {
    throw new Error("Invalid artists list.");
  }

  const out: LastFmArtistPayload[] = [];
  for (let i = 0; i < artists.length; i += 1) {
    const item = artists[i];
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : "Unknown";
    const rank = typeof o.rank === "number" ? o.rank : i + 1;
    const scrobbles = typeof o.scrobbles === "number" ? o.scrobbles : 0;
    out.push({ rank, name, scrobbles });
  }
  return out;
}

export function LastFmArtistsPanel() {
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/taste/lastfm-artists");
        const json: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof json === "object" && json !== null && "error" in json
              ? String((json as { error: unknown }).error)
              : "Failed to load Last.fm artists.";
          throw new Error(msg);
        }
        const artistRows = parseLastFmPayload(json);
        if (!cancelled) {
          setRows(
            artistRows.map((r) => ({
              rank: r.rank,
              name: r.name,
              scrobbles: r.scrobbles,
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
      title="Artists retrieved from Last.fm"
      description="All-time top artists by scrobbles (most to least). Up to 500 artists."
      footnote="A scrobble is a logged listen on Last.fm. Counts are from your public chart data (overall period)."
      columns={[
        { key: "rank", label: "#" },
        { key: "name", label: "Artist" },
        { key: "scrobbles", label: "Scrobbles", align: "right" },
      ]}
      rows={rows}
      pageSize={50}
      loading={loading}
      error={error}
    />
  );
}
