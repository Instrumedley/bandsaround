export type ConcertEvent = {
  id: string;
  artist: string;
  artistRank: number;
  city: string;
  country: string;
  venue: string;
  date: string;
  lat: number;
  lng: number;
  ticketUrl?: string;
  source?: "bandsintown";
  sourceEventId?: string;
};
