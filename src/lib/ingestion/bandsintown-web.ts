import {
  collectLooseEvents,
  filterMappedEvents,
  sleep,
} from "@/lib/ingestion/bandsintown-event-mapper";
import { fetchBandsintownResource } from "@/lib/ingestion/bandsintown-http";
import type { IngestionArtistInput } from "@/lib/ingestion/types";
import { normalizeArtistName } from "@/lib/normalize-artist-name";
import type { ConcertEvent } from "@/types/concert";

const SEARCH_SUGGESTIONS_URL = "https://www.bandsintown.com/searchSuggestions";
const REQUEST_DELAY_MS = 300;

type SearchSuggestionsArtist = {
  name: string;
  id: number;
  href: string;
  verified?: boolean;
};

type SearchSuggestionsResponse = {
  artists?: SearchSuggestionsArtist[];
};

function stripArtistPageUrl(href: string): string {
  const url = new URL(href);
  return `${url.origin}${url.pathname}`;
}

function scoreArtistMatch(query: string, candidate: SearchSuggestionsArtist): number {
  const normalizedQuery = normalizeArtistName(query);
  const normalizedCandidate = normalizeArtistName(candidate.name);

  if (normalizedQuery === normalizedCandidate) {
    return 100;
  }

  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    return 60;
  }

  return candidate.verified ? 10 : 0;
}

export function pickBestArtistMatch(
  query: string,
  artists: SearchSuggestionsArtist[],
): SearchSuggestionsArtist | null {
  if (artists.length === 0) {
    return null;
  }

  const ranked = [...artists].sort((left, right) => {
    const scoreDiff = scoreArtistMatch(query, right) - scoreArtistMatch(query, left);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return left.name.localeCompare(right.name);
  });

  return ranked[0] ?? null;
}

export async function searchBandsintownArtist(
  searchTerm: string,
): Promise<SearchSuggestionsArtist | null> {
  const url = new URL(SEARCH_SUGGESTIONS_URL);
  url.searchParams.set("searchTerm", searchTerm);
  url.searchParams.set("cameFromCode", "257");
  url.searchParams.set("typeOfPage", "homePage");
  url.searchParams.set("fetchVenueApiData", "false");

  const { status, body: text } = await fetchBandsintownResource(url.toString(), "application/json");

  if (status >= 400) {
    throw new Error(`Bandsintown search failed (${status}): ${text.slice(0, 180)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Bandsintown search returned invalid JSON");
  }

  const parsed = json as SearchSuggestionsResponse;
  return pickBestArtistMatch(searchTerm, parsed.artists ?? []);
}

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_FLIGHT_CHUNKS = 80;
const MAX_JSON_WALK_NODES = 40_000;

type ArtistPageEvent = {
  id?: number;
  startsAt?: string;
  venueName?: string;
  location?: string;
  eventUrl?: string;
  streamingEvent?: boolean;
};

type MusicEventGeo = {
  lat: number;
  lng: number;
  venueName?: string;
  ticketUrl?: string;
};

function extractBalancedJsonAfterMarker(html: string, marker: string): unknown | null {
  const start = html.indexOf(marker);
  if (start === -1) {
    return null;
  }

  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function extractEventIdFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/\/e\/(\d+)(?:-|$|\?)/);
  return match?.[1] ?? null;
}

function extractUpcomingEventsFromWindowData(html: string): ArtistPageEvent[] {
  const boundedHtml = html.length > MAX_HTML_BYTES ? html.slice(0, MAX_HTML_BYTES) : html;
  const data = extractBalancedJsonAfterMarker(boundedHtml, "window.__data=") as
    | {
        artistView?: {
          body?: {
            events?: {
              upcomingEvents?: {
                events?: ArtistPageEvent[];
              };
            };
          };
        };
      }
    | null;

  return data?.artistView?.body?.events?.upcomingEvents?.events ?? [];
}

function extractMusicEventGeoById(html: string): Map<string, MusicEventGeo> {
  const boundedHtml = html.length > MAX_HTML_BYTES ? html.slice(0, MAX_HTML_BYTES) : html;
  const geoById = new Map<string, MusicEventGeo>();
  const pattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

  for (const match of boundedHtml.matchAll(pattern)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1] ?? "null") as unknown;
    } catch {
      continue;
    }

    const events = Array.isArray(parsed) ? parsed : [parsed];
    for (const event of events) {
      if (!event || typeof event !== "object") {
        continue;
      }

      const record = event as Record<string, unknown>;
      if (record["@type"] !== "MusicEvent") {
        continue;
      }

      const eventId = extractEventIdFromUrl(typeof record.url === "string" ? record.url : undefined);
      const location = record.location;
      if (!eventId || !location || typeof location !== "object" || Array.isArray(location)) {
        continue;
      }

      const locationRecord = location as Record<string, unknown>;
      const geo = locationRecord.geo;
      if (!geo || typeof geo !== "object" || Array.isArray(geo)) {
        continue;
      }

      const geoRecord = geo as Record<string, unknown>;
      const lat = Number.parseFloat(String(geoRecord.latitude ?? ""));
      const lng = Number.parseFloat(String(geoRecord.longitude ?? ""));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }

      geoById.set(eventId, {
        lat,
        lng,
        venueName: typeof locationRecord.name === "string" ? locationRecord.name : undefined,
        ticketUrl: typeof record.url === "string" ? record.url : undefined,
      });
    }
  }

  return geoById;
}

function mapArtistPageEventsToLooseEvents(input: {
  events: ArtistPageEvent[];
  geoById: Map<string, MusicEventGeo>;
}): Array<Record<string, unknown>> {
  const looseEvents: Array<Record<string, unknown>> = [];

  for (const event of input.events) {
    if (event.streamingEvent) {
      continue;
    }

    const eventId = event.id !== undefined ? String(event.id) : extractEventIdFromUrl(event.eventUrl);
    const geo = eventId ? input.geoById.get(eventId) : undefined;

    looseEvents.push({
      id: event.id ?? eventId ?? undefined,
      startsAt: event.startsAt,
      venueName: event.venueName ?? geo?.venueName,
      location: event.location,
      eventUrl: event.eventUrl ?? geo?.ticketUrl,
      lat: geo?.lat,
      lng: geo?.lng,
    });
  }

  return looseEvents;
}

function decodeEscapedJsonChunk(chunk: string): string {
  return chunk
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\u0026/g, "&")
    .replace(/\\\\/g, "\\");
}

function extractJsonRootsFromHtml(html: string): unknown[] {
  const roots: unknown[] = [];
  const boundedHtml = html.length > MAX_HTML_BYTES ? html.slice(0, MAX_HTML_BYTES) : html;

  const nextDataMatch = boundedHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch?.[1]) {
    try {
      roots.push(JSON.parse(nextDataMatch[1]) as unknown);
    } catch {
      // Ignore malformed embedded payloads.
    }
  }

  const flightPattern = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let flightCount = 0;
  for (const match of boundedHtml.matchAll(flightPattern)) {
    flightCount += 1;
    if (flightCount > MAX_FLIGHT_CHUNKS) {
      break;
    }

    const decoded = decodeEscapedJsonChunk(match[1] ?? "");
    const jsonStart = decoded.indexOf("{");
    if (jsonStart === -1) {
      continue;
    }

    const candidate = decoded.slice(jsonStart);
    try {
      roots.push(JSON.parse(candidate) as unknown);
    } catch {
      // Flight chunks are not always standalone JSON documents.
    }
  }

  return roots;
}

export function extractEventsFromArtistPageHtml(html: string): Array<Record<string, unknown>> {
  const upcomingEvents = extractUpcomingEventsFromWindowData(html);
  if (upcomingEvents.length > 0) {
    const geoById = extractMusicEventGeoById(html);
    return mapArtistPageEventsToLooseEvents({ events: upcomingEvents, geoById });
  }

  const looseEvents: Array<Record<string, unknown>> = [];
  const seen = new WeakSet<object>();
  const budget = { remaining: MAX_JSON_WALK_NODES };

  for (const root of extractJsonRootsFromHtml(html)) {
    collectLooseEvents(root, looseEvents, seen, budget);
    if (budget.remaining <= 0) {
      break;
    }
  }

  return looseEvents;
}

export async function fetchEventsFromArtistPage(input: {
  artist: IngestionArtistInput;
  artistPageUrl: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<{ rawEventsCount: number; events: ConcertEvent[] }> {
  const { status, body: html } = await fetchBandsintownResource(
    input.artistPageUrl,
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  );

  if (status >= 400) {
    throw new Error(`Bandsintown artist page failed (${status}): ${html.slice(0, 180)}`);
  }

  const rawEvents = extractEventsFromArtistPageHtml(html);
  return filterMappedEvents({
    rawEvents,
    artist: input.artist,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });
}

export async function fetchBandsintownWebEventsForArtist(input: {
  artist: IngestionArtistInput;
  dateFrom: Date;
  dateTo: Date;
}): Promise<{
  rawEventsCount: number;
  events: ConcertEvent[];
  bandsintownArtistId?: number;
  bandsintownArtistUrl?: string;
}> {
  const match = await searchBandsintownArtist(input.artist.name);
  if (!match) {
    return { rawEventsCount: 0, events: [] };
  }

  const artistPageUrl = stripArtistPageUrl(match.href);
  const { rawEventsCount, events } = await fetchEventsFromArtistPage({
    artist: input.artist,
    artistPageUrl,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });

  return {
    rawEventsCount,
    events,
    bandsintownArtistId: match.id,
    bandsintownArtistUrl: artistPageUrl,
  };
}

export async function fetchBandsintownWebEventsForArtists(input: {
  artists: IngestionArtistInput[];
  dateFrom: Date;
  dateTo: Date;
}): Promise<{
  events: ConcertEvent[];
  artistResults: Array<{
    artist: string;
    rank: number;
    rawEventsCount: number;
    eventsFound: number;
    error?: string;
  }>;
}> {
  const eventsById = new Map<string, ConcertEvent>();
  const artistResults: Array<{
    artist: string;
    rank: number;
    rawEventsCount: number;
    eventsFound: number;
    error?: string;
  }> = [];

  for (let index = 0; index < input.artists.length; index += 1) {
    const artist = input.artists[index];

    if (index > 0) {
      await sleep(REQUEST_DELAY_MS);
    }

    try {
      const result = await fetchBandsintownWebEventsForArtist({
        artist,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      });

      for (const event of result.events) {
        eventsById.set(event.id, event);
      }

      artistResults.push({
        artist: artist.name,
        rank: artist.rank,
        rawEventsCount: result.rawEventsCount,
        eventsFound: result.events.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Bandsintown web error";
      artistResults.push({
        artist: artist.name,
        rank: artist.rank,
        rawEventsCount: 0,
        eventsFound: 0,
        error: message,
      });
    }
  }

  return {
    events: [...eventsById.values()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    ),
    artistResults,
  };
}

export function summarizeBandsintownWebSync(input: {
  artistResults: Array<{
    artist: string;
    rawEventsCount: number;
    eventsFound: number;
    error?: string;
  }>;
  events: ConcertEvent[];
}): { code: string; message: string } | null {
  const { artistResults, events } = input;
  const errors = artistResults.filter((result) => result.error);
  const rawEventsTotal = artistResults.reduce((sum, result) => sum + result.rawEventsCount, 0);
  const unresolvedArtists = artistResults.filter(
    (result) => !result.error && result.rawEventsCount === 0 && result.eventsFound === 0,
  ).length;

  if (errors.length === artistResults.length) {
    return {
      code: "BANDSINTOWN_WEB_ALL_FAILED",
      message: errors[0]?.error ?? "All Bandsintown web requests failed.",
    };
  }

  if (events.length === 0 && rawEventsTotal > 0) {
    return {
      code: "BANDSINTOWN_NO_EUROPE_EVENTS",
      message: `Bandsintown returned ${rawEventsTotal} upcoming show(s), but none were in supported Europe countries with map coordinates.`,
    };
  }

  if (events.length === 0 && unresolvedArtists === artistResults.length) {
    return {
      code: "BANDSINTOWN_NO_EVENTS",
      message:
        "Bandsintown returned no upcoming shows for your top artists in the next 6 months, or artist pages could not be parsed yet.",
    };
  }

  return null;
}
