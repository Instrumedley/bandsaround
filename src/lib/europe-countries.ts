export const MAIN_EUROPE_COUNTRIES = [
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

export type EuropeCountry = (typeof MAIN_EUROPE_COUNTRIES)[number];

const COUNTRY_ALIASES: Record<string, EuropeCountry> = {
  austria: "Austria",
  belgium: "Belgium",
  "czech republic": "Czech Republic",
  czechia: "Czech Republic",
  denmark: "Denmark",
  finland: "Finland",
  france: "France",
  germany: "Germany",
  ireland: "Ireland",
  italy: "Italy",
  netherlands: "Netherlands",
  holland: "Netherlands",
  norway: "Norway",
  poland: "Poland",
  portugal: "Portugal",
  spain: "Spain",
  sweden: "Sweden",
  switzerland: "Switzerland",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
};

export function normalizeCountryName(value: string | undefined): EuropeCountry | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized in COUNTRY_ALIASES) {
    return COUNTRY_ALIASES[normalized];
  }

  const match = MAIN_EUROPE_COUNTRIES.find((country) => country.toLowerCase() === normalized);
  return match ?? null;
}

export function isEuropeCountry(value: string | undefined): value is EuropeCountry {
  return normalizeCountryName(value) !== null;
}
