export type SpotifyArtistTasteRow = {
  rank: number;
  name: string;
  popularity: number;
  genres: string;
};

export type LastFmArtistTasteRow = {
  rank: number;
  name: string;
  scrobbles: number;
};

export const TASTE_PROFILE_MAX_ARTISTS = 50;

export type TasteProfileArtist = {
  rank: number;
  name: string;
  normalizedName: string;
  source: "spotify";
  popularity: number;
  genres: string;
};

export type TasteProfile = {
  userId: string;
  artists: TasteProfileArtist[];
  sourceSummary: {
    spotify: number;
  };
  syncedAt: string;
};
