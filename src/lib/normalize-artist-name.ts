/** Lowercase, trim, and drop a leading "The " for cross-source artist matching. */
export function normalizeArtistName(name: string): string {
  return name.trim().toLowerCase().replace(/^the\s+/, "");
}
