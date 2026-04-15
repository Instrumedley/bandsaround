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

## Next implementation steps

- Add app auth (Google + email/password)
- Add Spotify / Last.fm account linking
- Replace mock data with API + database-backed events
- Add real marker clustering and event detail routes
