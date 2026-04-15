"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ConcertEvent } from "@/types/concert";

type ViewMode = "map" | "list";
type SortMode = "date" | "artist" | "country";

const MAIN_EUROPE_COUNTRIES = [
  "Austria",
  "Belgium",
  "Czech Republic",
  "Denmark",
  "Finland",
  "France",
  "Germany",
  "Ireland",
  "Italy",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
] as const;

const MAP_CLUSTER_THRESHOLD = 10;
const DEFAULT_MONTH_WINDOW = 6;

const MOCK_EVENTS: ConcertEvent[] = [
  { id: "1", artist: "Tesseract", artistRank: 3, city: "London", country: "United Kingdom", venue: "Roundhouse", date: "2026-06-18", lat: 51.5074, lng: -0.1278 },
  { id: "2", artist: "Leprous", artistRank: 11, city: "Oslo", country: "Norway", venue: "Sentrum Scene", date: "2026-07-02", lat: 59.9139, lng: 10.7522 },
  { id: "3", artist: "Soen", artistRank: 18, city: "Stockholm", country: "Sweden", venue: "Debaser", date: "2026-08-08", lat: 59.3293, lng: 18.0686 },
  { id: "4", artist: "Vola", artistRank: 7, city: "Copenhagen", country: "Denmark", venue: "Vega", date: "2026-09-11", lat: 55.6761, lng: 12.5683 },
  { id: "5", artist: "Karnivool", artistRank: 26, city: "Berlin", country: "Germany", venue: "Columbiahalle", date: "2026-06-29", lat: 52.52, lng: 13.405 },
  { id: "6", artist: "Riverside", artistRank: 34, city: "Warsaw", country: "Poland", venue: "Progresja", date: "2026-05-29", lat: 52.2297, lng: 21.0122 },
  { id: "7", artist: "Haken", artistRank: 9, city: "Paris", country: "France", venue: "Bataclan", date: "2026-06-09", lat: 48.8566, lng: 2.3522 },
  { id: "8", artist: "The Pineapple Thief", artistRank: 42, city: "Amsterdam", country: "Netherlands", venue: "Melkweg", date: "2026-08-14", lat: 52.3676, lng: 4.9041 },
  { id: "9", artist: "Agent Fresco", artistRank: 51, city: "Madrid", country: "Spain", venue: "La Riviera", date: "2026-07-19", lat: 40.4168, lng: -3.7038 },
  { id: "10", artist: "Porcupine Tree", artistRank: 1, city: "Milan", country: "Italy", venue: "Alcatraz", date: "2026-05-22", lat: 45.4642, lng: 9.19 },
];

function addMonths(baseDate: Date, months: number): Date {
  const result = new Date(baseDate);
  result.setMonth(result.getMonth() + months);
  return result;
}

const ConcertMap = dynamic(
  async () => (await import("@/components/concert-map")).ConcertMap,
  { ssr: false },
);

export default function Home() {
  const now = new Date();
  const defaultDateTo = addMonths(now, DEFAULT_MONTH_WINDOW);

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [dateFrom, setDateFrom] = useState(now.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(defaultDateTo.toISOString().slice(0, 10));
  const [excludedCountries, setExcludedCountries] = useState<string[]>([]);

  const filteredEvents = useMemo(() => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    return MOCK_EVENTS.filter((event) => {
      if (event.artistRank > 50) {
        return false;
      }

      if (excludedCountries.includes(event.country)) {
        return false;
      }

      const eventDate = new Date(event.date);
      return eventDate >= from && eventDate <= to;
    }).sort((a, b) => {
      if (sortMode === "artist") {
        return a.artist.localeCompare(b.artist);
      }

      if (sortMode === "country") {
        return a.country.localeCompare(b.country);
      }

      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [dateFrom, dateTo, excludedCountries, sortMode]);

  const shouldCluster = filteredEvents.length > MAP_CLUSTER_THRESHOLD;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-cyan-300">Bands Around MVP</p>
          <h1 className="text-3xl font-semibold">Europe Concert Discovery</h1>
          <p className="text-sm text-slate-300">
            Default scope is main Europe countries, upcoming 6 months, and top 50 imported artists.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium ${viewMode === "map" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-100"}`}
              onClick={() => setViewMode("map")}
            >
              Map view
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium ${viewMode === "list" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-100"}`}
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
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              To date
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              List sort
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
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
                        : "border-slate-700 bg-slate-800 text-slate-200"
                    }`}
                  >
                    {country}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {viewMode === "map" ? (
          <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <p>
                Showing {filteredEvents.length} event(s){" "}
                {shouldCluster
                  ? `(cluster mode active over threshold ${MAP_CLUSTER_THRESHOLD})`
                  : "(one pin per event)"}
              </p>
            </div>
            <ConcertMap events={filteredEvents} shouldCluster={shouldCluster} />
          </section>
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-300">
                  <th className="py-2">Date</th>
                  <th className="py-2">Band</th>
                  <th className="py-2">Country</th>
                  <th className="py-2">City</th>
                  <th className="py-2">Venue</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-800">
                    <td className="py-2">{event.date}</td>
                    <td className="py-2">{event.artist}</td>
                    <td className="py-2">{event.country}</td>
                    <td className="py-2">{event.city}</td>
                    <td className="py-2">{event.venue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
