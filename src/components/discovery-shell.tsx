"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ConcertSyncPanel } from "@/components/concert-sync-panel";
import { MAIN_EUROPE_COUNTRIES } from "@/lib/europe-countries";
import { TASTE_PROFILE_MAX_ARTISTS, type TasteProfile } from "@/lib/taste-types";
import type { ConcertEvent } from "@/types/concert";

type ViewMode = "map" | "list";
type SortMode = "date" | "artist" | "country";

type EventsMeta = {
  syncedAt: string;
  artistsQueried: number;
  artistsWithEvents: number;
  rawEventsTotal: number;
  dateFrom: string;
  dateTo: string;
  syncWarning?: string;
  sampleError?: string;
};

type DiscoveryShellProps = {
  tasteProfile: TasteProfile | null;
  spotifyConnected: boolean;
  events: ConcertEvent[];
  eventsMeta: EventsMeta | null;
};

const MAP_CLUSTER_THRESHOLD = 10;
const DEFAULT_MONTH_WINDOW = 6;

function addMonths(baseDate: Date, months: number): Date {
  const result = new Date(baseDate);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatSyncedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const ConcertMap = dynamic(
  async () => (await import("@/components/concert-map")).ConcertMap,
  { ssr: false },
);

export function DiscoveryShell({
  tasteProfile,
  spotifyConnected,
  events,
  eventsMeta,
}: DiscoveryShellProps) {
  const now = new Date();
  const defaultDateTo = addMonths(now, DEFAULT_MONTH_WINDOW);

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [dateFrom, setDateFrom] = useState(now.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(defaultDateTo.toISOString().slice(0, 10));
  const [excludedCountries, setExcludedCountries] = useState<string[]>([]);

  const filteredEvents = useMemo(() => {
    if (!tasteProfile) {
      return [];
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    return events
      .filter((event) => {
        if (excludedCountries.includes(event.country)) {
          return false;
        }

        const eventDate = new Date(event.date);
        return eventDate >= from && eventDate <= to;
      })
      .sort((a, b) => {
        if (sortMode === "artist") {
          return a.artist.localeCompare(b.artist);
        }

        if (sortMode === "country") {
          return a.country.localeCompare(b.country);
        }

        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [tasteProfile, events, dateFrom, dateTo, excludedCountries, sortMode]);

  const shouldCluster = filteredEvents.length > MAP_CLUSTER_THRESHOLD;

  return (
    <>
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.18em] text-brand-accent">Bands Around MVP</p>
        <h1 className="text-3xl font-semibold">Europe Concert Discovery</h1>
        <p className="text-sm text-brand-muted">
          Upcoming concerts in main Europe countries for your top {TASTE_PROFILE_MAX_ARTISTS} Spotify
          artists, sourced from Bandsintown.
        </p>
      </header>

      {!tasteProfile ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {!spotifyConnected ? (
            <p>
              Connect Spotify in{" "}
              <Link href="/settings" className="font-medium underline">
                Settings
              </Link>{" "}
              to build your taste profile and fetch concerts for your top artists.
            </p>
          ) : (
            <p>
              Spotify is connected but your taste profile has not been synced yet. Open{" "}
              <Link href="/settings" className="font-medium underline">
                Settings
              </Link>{" "}
              and use <span className="font-medium">Refresh taste profile</span>.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-brand-accent/35 bg-brand-accent/10 p-4 text-sm text-brand-cream">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p>
                Taste profile:{" "}
                <span className="font-medium">{tasteProfile.artists.length} artists</span>, last synced{" "}
                {formatSyncedAt(tasteProfile.syncedAt)}.
              </p>
              {eventsMeta ? (
                <p className="mt-2">
                  Events cache:{" "}
                  <span className="font-medium">{events.length} Europe shows</span> from{" "}
                  {eventsMeta.artistsWithEvents}/{eventsMeta.artistsQueried} artists, synced{" "}
                  {formatSyncedAt(eventsMeta.syncedAt)} ({eventsMeta.dateFrom} to {eventsMeta.dateTo}).
                </p>
              ) : (
                <p className="mt-2 text-brand-muted">
                  No concert data yet. Use <span className="font-medium">Refresh concerts</span> below.
                </p>
              )}
            </div>
            <ConcertSyncPanel />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-brand-border bg-brand-surface p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${viewMode === "map" ? "bg-brand-accent text-brand-ink" : "bg-brand-elevated text-brand-cream"}`}
            onClick={() => setViewMode("map")}
          >
            Map view
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${viewMode === "list" ? "bg-brand-accent text-brand-ink" : "bg-brand-elevated text-brand-cream"}`}
            onClick={() => setViewMode("list")}
          >
            List view
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            From date
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-md border border-brand-border/90 bg-brand-ink px-2 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            To date
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-md border border-brand-border/90 bg-brand-ink px-2 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            List sort
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-md border border-brand-border/90 bg-brand-ink px-2 py-2"
            >
              <option value="date">Date (soonest first)</option>
              <option value="artist">Band name</option>
              <option value="country">Country</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Exclude countries</p>
          <div className="flex flex-wrap gap-2">
            {MAIN_EUROPE_COUNTRIES.map((country) => {
              const isExcluded = excludedCountries.includes(country);
              return (
                <button
                  key={country}
                  type="button"
                  onClick={() =>
                    setExcludedCountries((previous) =>
                      isExcluded
                        ? previous.filter((item) => item !== country)
                        : [...previous, country],
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs ${
                    isExcluded
                      ? "border-rose-400 bg-rose-500/20 text-rose-100"
                      : "border-brand-border/90 bg-brand-elevated text-brand-cream/95"
                  }`}
                >
                  {country}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {!tasteProfile ? (
        <section className="rounded-xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-muted">
          Connect and sync Spotify, then refresh concerts to see results here.
        </section>
      ) : !eventsMeta ? (
        <section className="rounded-xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-muted">
          Your taste profile is ready. Click <span className="font-medium">Refresh concerts</span> to
          fetch upcoming Europe shows from Bandsintown.
        </section>
      ) : viewMode === "map" ? (
        <section className="space-y-2 rounded-xl border border-brand-border bg-brand-surface p-4">
          <div className="flex items-center justify-between text-sm text-brand-muted">
            <p>
              Showing {filteredEvents.length} event(s){" "}
              {shouldCluster
                ? `(cluster mode active over threshold ${MAP_CLUSTER_THRESHOLD})`
                : "(one pin per event)"}
            </p>
          </div>
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-brand-dim">
              No Europe concerts match your filters. Try widening the date range or refreshing concerts.
            </p>
          ) : (
            <ConcertMap events={filteredEvents} shouldCluster={shouldCluster} />
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-brand-border bg-brand-surface p-4">
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-brand-dim">
              No Europe concerts match your filters in this date range.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-border/90 text-left text-brand-muted">
                  <th className="py-2">Date</th>
                  <th className="py-2">Band</th>
                  <th className="py-2">Rank</th>
                  <th className="py-2">Country</th>
                  <th className="py-2">City</th>
                  <th className="py-2">Venue</th>
                  <th className="py-2">Tickets</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-brand-border">
                    <td className="py-2">{event.date}</td>
                    <td className="py-2">{event.artist}</td>
                    <td className="py-2">#{event.artistRank}</td>
                    <td className="py-2">{event.country}</td>
                    <td className="py-2">{event.city}</td>
                    <td className="py-2">{event.venue}</td>
                    <td className="py-2">
                      {event.ticketUrl ? (
                        <a
                          href={event.ticketUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-accent hover:underline"
                        >
                          Link
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  );
}
