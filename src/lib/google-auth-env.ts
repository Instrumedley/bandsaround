/**
 * Server-only: true when Google OAuth env vars are set for NextAuth.
 */
export function isGoogleOAuthConfigured(): boolean {
  const id = process.env.AUTH_GOOGLE_ID?.trim();
  const secret = process.env.AUTH_GOOGLE_SECRET?.trim();
  return Boolean(id && secret);
}
