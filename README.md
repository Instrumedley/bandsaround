## Bands Around (Code Workspace)

This folder contains the runnable web app code for the Bands Around MVP.

Tech stack:

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Leaflet + React Leaflet (Europe map view)

Scope references remain in the parent folder:

- `../concert_app_user_mvp_scope.md`
- `../concert_app_mvp_ingestion_architecture.md`

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## What is implemented now

- Europe-only discovery shell with map/list toggle
- Date range filters (default upcoming 6 months)
- Country exclusion filters
- List sorting by date, band name, or country
- Pin labels (band name text) on map
- Top-50 artist cap applied in filtering
- Configurable map clustering threshold constant (`MAP_CLUSTER_THRESHOLD`, default `10`)

## Auth foundation

- NextAuth setup with Google + Credentials providers
- Protected routes:
  - `/dashboard`
  - `/settings`
- Login page at `/login` with:
  - Continue with Google
  - Email/password sign-in form
  - Button linking to `/signup`
- Signup at `/signup` (min 8 character password); users stored in `data/users.json`
  (gitignored). Use a real database in production.
- Root route `/` redirects to `/login` (or `/dashboard` if authenticated)
- Settings page can **connect Spotify** and **Last.fm** (OAuth / web auth); tokens stored locally in
  `data/user-integrations.json` (see `/data/` gitignore)

### Auth environment variables

Copy `.env.example` to `.env.local` and fill values:

```bash
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_DEMO_EMAIL=...
AUTH_DEMO_PASSWORD=...
```

### Google sign-in / sign-up (OAuth)

The app uses [NextAuth.js](https://next-auth.js.org/) with the Google provider. **Sign in** and **Sign up**
with Google use the **same OAuth flow**; new Google users get a session on first use.

**What you need to do:**

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or create a project.
2. Go to **APIs & Services** → **OAuth consent screen**. Choose **External** (unless you use a Workspace
   org-only app), fill the app name and support email, and add scopes if prompted (defaults are enough for
   email/profile).
3. Go to **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins** (add your real URLs):
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.com`
6. **Authorized redirect URIs** — add exactly (replace host for production):

   `http://localhost:3000/api/auth/callback/google`

7. Copy the **Client ID** and **Client secret** into `.env.local` as `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`.
8. Set `NEXTAUTH_URL` to the same origin as the app (e.g. `http://localhost:3000` locally, or your
   production URL). This is required for OAuth redirect URLs to resolve correctly.
9. While the OAuth app is in **Testing**, add your Google account under **Test users** on the consent
   screen so you can sign in.

Button styling follows [Sign in with Google branding guidelines](https://developers.google.com/identity/branding-guidelines).

### Spotify account linking

Used to read top artists later (`user-top-read` scope). Create an app in the
[Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

1. **Redirect URI** (must match `.env.local` exactly):

   `http://localhost:3000/api/integrations/spotify/callback`

2. Add the same origin under **Redirect URIs** for production when you deploy.
3. Copy **Client ID** and **Client secret** into `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
4. Set `SPOTIFY_REDIRECT_URI` to the same callback URL as in the dashboard.

### Last.fm account linking

Create an API key on [Last.fm API account](https://www.last.fm/api/account/create).

1. Set **Authorized callback URL** to the same value as `LASTFM_REDIRECT_URI`, e.g.:

   `http://localhost:3000/api/integrations/lastfm/callback`

2. Put **API Key** and **Shared secret** into `LASTFM_API_KEY` and `LASTFM_API_SECRET`.

## Next implementation steps

- Import and merge Spotify / Last.fm top artists into a taste profile (top 50 cap)
- Replace mock data with API + database-backed events
- Add real marker clustering and event detail routes
