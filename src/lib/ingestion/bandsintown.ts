import { isEuropeCountry, normalizeCountryName } from "@/lib/europe-countries";
import type { IngestionArtistInput } from "@/lib/ingestion/types";
import type { ConcertEvent } from "@/types/concert";

const BASE_URL = "https://rest.bandsintown.com";
const REQUEST_DELAY_MS = 250;

type BandsintownVenue = {
  name?: string;
  latitude?: string | number;
  longitude?: string | number;
  city?: string;
  region?: string;
  country?: string;
};

type BandsintownEvent = {
  id?: string | number;
  datetime?: string;
  url?: string;
  venue?: BandsintownVenue;
  lineup?: string[];
  offers?: Array<{ url?: string; status?: string }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function encodeArtistNameForPath(name: string): string {
  return encodeURIComponent(name.trim())
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function formatDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseEventDate(datetime: string | undefined): string | null {
  if (!datetime) {
    return null;
  }

  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseCoordinate(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function pickTicketUrl(event: BandsintownEvent): string | undefined {
  const available = event.offers?.find(
    (offer) => offer.status?.toLowerCase() === "available" && offer.url,
  );
  return available?.url ?? event.url;
}

function getBandsintownErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return null;
  }

  const record = json as Record<string, unknown>;
  const message = record.Message ?? record.message ?? record.error;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

function parseEventsResponse(json: unknown): BandsintownEvent[] {
  const errorMessage = getBandsintownErrorMessage(json);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (!Array.isArray(json)) {
    return [];
  }

  return json as BandsintownEvent[];
}

function isWithinDateWindow(date: string, dateFrom: Date, dateTo: Date): boolean {
  const eventDate = new Date(date);
  const from = new Date(formatDateParam(dateFrom));
  const to = new Date(formatDateParam(dateTo));
  return eventDate >= from && eventDate <= to;
}

function toConcertEvent(
  event: BandsintownEvent,
  artist: IngestionArtistInput,
): ConcertEvent | null {
  const date = parseEventDate(event.datetime);
  const country = normalizeCountryName(event.venue?.country);
  const lat = parseCoordinate(event.venue?.latitude);
  const lng = parseCoordinate(event.venue?.longitude);
  const venue = event.venue?.name?.trim();
  const city = event.venue?.city?.trim();

  if (!date || !country || !isEuropeCountry(country) || lat === null || lng === null || !venue || !city) {
    return null;
  }

  const sourceEventId = event.id !== undefined ? String(event.id) : `${artist.name}-${date}-${venue}`;

  return {
    id: `bit-${sourceEventId}`,
    artist: artist.name,
    artistRank: artist.rank,
    city,
    country,
    venue,
    date,
    lat,
    lng,
    ticketUrl: pickTicketUrl(event),
    source: "bandsintown",
    sourceEventId,
  };
}

function mapArtistEvents(input: {
  events: BandsintownEvent[];
  artist: IngestionArtistInput;
  dateFrom: Date;
  dateTo: Date;
}): { rawEventsCount: number; events: ConcertEvent[] } {
  const inWindow = input.events.filter((event) => {
    const date = parseEventDate(event.datetime);
    return date ? isWithinDateWindow(date, input.dateFrom, input.dateTo) : false;
  });

  const events = inWindow
    .map((event) => toConcertEvent(event, input.artist))
    .filter((event): event is ConcertEvent => event !== null);

  return {
    rawEventsCount: inWindow.length,
    events,
  };
}

export async function fetchBandsintownEventsForArtist(input: {
  artist: IngestionArtistInput;
  appId: string;
  dateFrom: Date;
  dateTo: Date;
}): Promise<{ rawEventsCount: number; events: ConcertEvent[] }> {
  const { artist, appId, dateFrom, dateTo } = input;
  const artistPath = encodeArtistNameForPath(artist.name);
  const url = new URL(`${BASE_URL}/artists/${artistPath}/events`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("date", `${formatDateParam(dateFrom)},${formatDateParam(dateTo)}`);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "BandsAround/0.1 (local experiment)",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return { rawEventsCount: 0, events: [] };
  }

  const text = await response.text();
  let json: unknown;

  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Bandsintown returned invalid JSON (${response.status})`);
  }

  const apiError = getBandsintownErrorMessage(json);
  if (apiError) {
    throw new Error(`Bandsintown API error (${response.status}): ${apiError}`);
  }

  if (!response.ok) {
    throw new Error(`Bandsintown request failed (${response.status}): ${text.slice(0, 180)}`);
  }

  const events = parseEventsResponse(json);
  return mapArtistEvents({ events, artist, dateFrom, dateTo });
}

export async function fetchBandsintownEventsForArtists(input: {
  artists: IngestionArtistInput[];
  appId: string;
  dateFrom: Date;
  dateTo: Date;
  onProgress?: (result: {
    artist: string;
    rawEventsCount: number;
    eventsFound: number;
    error?: string;
  }) => void;
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
      const { rawEventsCount, events } = await fetchBandsintownEventsForArtist({
        artist,
        appId: input.appId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      });

      for (const event of events) {
        eventsById.set(event.id, event);
      }

      const result = {
        artist: artist.name,
        rank: artist.rank,
        rawEventsCount,
        eventsFound: events.length,
      };
      artistResults.push(result);
      input.onProgress?.(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Bandsintown error";
      const result = {
        artist: artist.name,
        rank: artist.rank,
        rawEventsCount: 0,
        eventsFound: 0,
        error: message,
      };
      artistResults.push(result);
      input.onProgress?.(result);
    }
  }

  return {
    events: [...eventsById.values()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    ),
    artistResults,
  };
}

export function getBandsintownAppId(): string {
  const appId = process.env.BANDSINTOWN_APP_ID?.trim();
  if (!appId) {
    throw new Error(
      "BANDSINTOWN_APP_ID_MISSING:Set BANDSINTOWN_APP_ID in .env.local to a valid Bandsintown for Artists API key.",
    );
  }
  return appId;
}

export function summarizeBandsintownSync(input: {
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

  if (errors.length === artistResults.length) {
    const firstError = errors[0]?.error ?? "Unknown Bandsintown error";
    if (/403|not authorized|deny/i.test(firstError)) {
      return {
        code: "BANDSINTOWN_UNAUTHORIZED",
        message:
          "Bandsintown rejected the API app id. Set BANDSINTOWN_APP_ID in .env.local to a valid key from Bandsintown for Artists (Settings → General → API Key).",
      };
    }

    return {
      code: "BANDSINTOWN_ALL_FAILED",
      message: firstError,
    };
  }

  if (events.length === 0 && rawEventsTotal > 0) {
    return {
      code: "BANDSINTOWN_NO_EUROPE_EVENTS",
      message: `Bandsintown returned ${rawEventsTotal} upcoming show(s), but none were in supported Europe countries with map coordinates.`,
    };
  }

  if (events.length === 0 && errors.length === 0) {
    return {
      code: "BANDSINTOWN_NO_EVENTS",
      message: "Bandsintown returned no upcoming shows for your top artists in the next 6 months.",
    };
  }

  return null;
}
