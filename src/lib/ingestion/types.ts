import type { ConcertEvent } from "@/types/concert";

export type EventIngestionProviderId = "bandsintown-web";

export type IngestionArtistInput = {
  name: string;
  rank: number;
};

export type ArtistIngestionResult = {
  artist: string;
  rank: number;
  rawEventsCount: number;
  eventsFound: number;
  error?: string;
};

export type EventIngestionSyncResult = {
  provider: EventIngestionProviderId;
  syncedAt: string;
  dateFrom: string;
  dateTo: string;
  artistsQueried: number;
  artistsWithEvents: number;
  rawEventsTotal: number;
  events: ConcertEvent[];
  artistResults: ArtistIngestionResult[];
  syncWarning?: string;
};
