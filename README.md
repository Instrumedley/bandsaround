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

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) (recommended when using Spotify linking) or
[http://localhost:3000](http://localhost:3000) with your browser to see the result.

## What is implemented now

- Europe-only discovery shell with map/list toggle
- Date range filters (default upcoming 6 months)
- Country exclusion filters
- List sorting by date, band name, or country
- Pin labels (band name text) on map
- Taste profile artist cap (`TASTE_PROFILE_MAX_ARTISTS`, default 150) applied in filtering
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
- **Unified taste profile** (Spotify-only for now): top 150 artists synced from Spotify, stored in
  `data/taste-profiles.json`; auto-syncs on Spotify connect; manual refresh on Settings
- Dashboard filters concerts by your taste profile using ingested Bandsintown data
- **Event ingestion (Bandsintown)**: refresh concerts from Settings/Dashboard; stores Europe shows in `data/user-events.json`

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

Spotify’s rules for redirect URIs are strict: **`localhost` is not allowed**; you must use an explicit
loopback IP such as **`127.0.0.1`**. See Spotify’s [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) documentation.

1. In the app’s **Redirect URIs**, add (must match `.env.local` **exactly**, including scheme and port):

   `http://127.0.0.1:3000/api/integrations/spotify/callback`

2. Set in `.env.local`:

   - `SPOTIFY_REDIRECT_URI` to that same URL  
   - `NEXTAUTH_URL=http://127.0.0.1:3000` so the app’s “canonical” origin matches during dev  

3. **Open the app at** `http://127.0.0.1:3000` (not `http://localhost:3000`) while testing Spotify linking,
   so your session cookie and OAuth redirects stay on the same origin.

4. If you use **Google sign-in**, add `http://127.0.0.1:3000` to **Authorized JavaScript origins** and add
   redirect URI `http://127.0.0.1:3000/api/auth/callback/google` so Google matches the same origin.

5. Copy **Client ID** and **Client secret** into `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.

6. For production, add an **https** redirect URI (e.g. `https://your-domain.com/api/integrations/spotify/callback`).

### Last.fm account linking

Create an API key on [Last.fm API account](https://www.last.fm/api/account/create).

1. Set **Authorized callback URL** to the same value as `LASTFM_REDIRECT_URI`, e.g.:

   `http://127.0.0.1:3000/api/integrations/lastfm/callback`

   (Use the same host/port as `NEXTAUTH_URL` so sessions stay consistent.)

2. Put **API Key** and **Shared secret** into `LASTFM_API_KEY` and `LASTFM_API_SECRET`.

## Concert sync (Bandsintown web)

Ingestion uses the public Bandsintown website (search + artist pages), not the official REST API.
No `BANDSINTOWN_APP_ID` is required. Requests are paced and cached to keep volume low.

**Workflow on the dashboard**

1. Connect Spotify on **Settings** and refresh your taste profile (top 150 artists).
2. **Collect artist URLs** — one-time Bandsintown lookup per artist; stored in `data/bandsintown-artists.json` (shared across users on this instance).
3. **Refresh concerts** — parses cached artist pages for Europe shows (next 6 months by default). Per-artist tour data is reused for **30 days** unless you force refresh.

If Cloudflare blocks a request, wait a few minutes and retry. The sync panel logs each step.

Use branch `pof/bandsintown-main` (or merge it into `main`) for this ingestion stack.

## Next implementation steps

- Add event detail routes and richer map popups (ticket links already in list view)
- Add real marker clustering improvements
- Add Last.fm into the unified taste profile merge
- Optional second ingestion provider behind the same interface
