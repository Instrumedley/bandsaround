import { isEuropeCountry, normalizeCountryName } from "@/lib/europe-countries";
import type { IngestionArtistInput } from "@/lib/ingestion/types";
import type { ConcertEvent } from "@/types/concert";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function formatDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseEventDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
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

function isWithinDateWindow(date: string, dateFrom: Date, dateTo: Date): boolean {
  const eventDate = new Date(date);
  const from = new Date(formatDateParam(dateFrom));
  const to = new Date(formatDateParam(dateTo));
  return eventDate >= from && eventDate <= to;
}

type LooseVenue = {
  name?: string;
  latitude?: string | number;
  longitude?: string | number;
  city?: string;
  country?: string;
};

type LooseEvent = {
  id?: string | number;
  datetime?: string;
  starts_at?: string;
  startsAt?: string;
  startDate?: string;
  url?: string;
  event_url?: string;
  eventUrl?: string;
  ticket_url?: string;
  venueName?: string;
  location?: string;
  venue?: LooseVenue;
  lat?: string | number;
  lng?: string | number;
  offers?: Array<{ url?: string; status?: string }>;
};

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
]);

export function parseBandsintownLocation(
  location: string | undefined,
): { city: string | null; country: string | null } {
  if (!location?.trim()) {
    return { city: null, country: null };
  }

  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { city: null, country: null };
  }

  if (parts.length === 1) {
    return { city: parts[0], country: null };
  }

  const city = parts[0];
  const region = parts[parts.length - 1];
  const normalizedCountry = normalizeCountryName(region);
  if (normalizedCountry) {
    return { city, country: normalizedCountry };
  }

  if (US_STATE_CODES.has(region.toUpperCase())) {
    return { city, country: "United States" };
  }

  return { city, country: region };
}

function pickTicketUrl(event: LooseEvent): string | undefined {
  const available = event.offers?.find(
    (offer) => offer.status?.toLowerCase() === "available" && offer.url,
  );
  return available?.url ?? event.ticket_url ?? event.eventUrl ?? event.url ?? event.event_url;
}

export function getEventDateTime(event: LooseEvent): string | undefined {
  return event.datetime ?? event.startsAt ?? event.starts_at ?? event.startDate;
}

export function mapLooseEventToConcert(
  event: LooseEvent,
  artist: IngestionArtistInput,
): ConcertEvent | null {
  const parsedLocation = parseBandsintownLocation(event.location);
  const date = parseEventDate(getEventDateTime(event));
  const country =
    normalizeCountryName(event.venue?.country) ?? normalizeCountryName(parsedLocation.country ?? undefined);
  const lat = parseCoordinate(event.lat ?? event.venue?.latitude);
  const lng = parseCoordinate(event.lng ?? event.venue?.longitude);
  const venue = event.venue?.name?.trim() ?? event.venueName?.trim();
  const city = event.venue?.city?.trim() ?? parsedLocation.city?.trim() ?? null;

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

export function filterMappedEvents(input: {
  rawEvents: LooseEvent[];
  artist: IngestionArtistInput;
  dateFrom: Date;
  dateTo: Date;
}): { rawEventsCount: number; events: ConcertEvent[] } {
  const inWindow = input.rawEvents.filter((event) => {
    const date = parseEventDate(getEventDateTime(event));
    return date ? isWithinDateWindow(date, input.dateFrom, input.dateTo) : false;
  });

  const events = inWindow
    .map((event) => mapLooseEventToConcert(event, input.artist))
    .filter((event): event is ConcertEvent => event !== null);

  return {
    rawEventsCount: inWindow.length,
    events,
  };
}

export function looksLikeLooseEvent(value: Record<string, unknown>): boolean {
  const venue = value.venue;
  const hasNestedVenue =
    venue &&
    typeof venue === "object" &&
    !Array.isArray(venue) &&
    ("city" in venue || "name" in venue || "country" in venue);
  const hasFlatVenue = "venueName" in value && "location" in value;
  const hasDate =
    "datetime" in value ||
    "startsAt" in value ||
    "starts_at" in value ||
    "startDate" in value;
  return Boolean((hasNestedVenue || hasFlatVenue) && hasDate);
}

export function collectLooseEvents(
  node: unknown,
  out: LooseEvent[],
  seen: WeakSet<object>,
  budget: { remaining: number },
): void {
  if (budget.remaining <= 0) {
    return;
  }
  budget.remaining -= 1;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectLooseEvents(item, out, seen, budget);
      if (budget.remaining <= 0) {
        return;
      }
    }
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const objectNode = node as object;
  if (seen.has(objectNode)) {
    return;
  }
  seen.add(objectNode);

  const record = node as Record<string, unknown>;
  if (looksLikeLooseEvent(record)) {
    out.push(record as LooseEvent);
  }

  for (const value of Object.values(record)) {
    collectLooseEvents(value, out, seen, budget);
    if (budget.remaining <= 0) {
      return;
    }
  }
}
