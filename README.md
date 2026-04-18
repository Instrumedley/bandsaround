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
- Settings page includes account-linking placeholders for Spotify / Last.fm

### Auth environment variables

Copy `.env.example` to `.env.local` and fill values:

```bash
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_DEMO_EMAIL=...
AUTH_DEMO_PASSWORD=...
```

## Next implementation steps

- Add Spotify / Last.fm account linking
- Replace mock data with API + database-backed events
- Add real marker clustering and event detail routes
