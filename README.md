# Garden Plants Dashboard

Single-user, localhost-only plant tracker: React (Vite) client, Express API, Postgres 16.

## Requirements

- Node 20+
- Postgres 16 running locally (Homebrew, below) or any reachable Postgres instance

## Setup

Install and start Postgres, then create the role and database the app expects:

```bash
brew install postgresql@16
brew services start postgresql@16          # restarts at login; `stop` to shut it down

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"   # formula is keg-only
psql -d postgres -c "CREATE ROLE plants LOGIN PASSWORD 'plants'"
createdb -O plants plants
```

Then run the app:

```bash
cp .env.example .env
npm install
npm run dev               # API on :3001, client on :5173
```

Open http://127.0.0.1:5173. The page reports API and database health.

Migrations run automatically on server start; `npm run migrate` applies them without booting the API.

Homebrew keeps the cluster in `/opt/homebrew/var/postgresql@16` and logs in
`/opt/homebrew/var/log/postgresql@16.log`. Because the formula is keg-only, `psql`, `pg_dump`,
and friends are not on `PATH` until you add the line above to your shell profile.

## Using a managed Postgres instead

Point `DATABASE_URL` in `.env` at the managed instance (Neon, Supabase, RDS) and skip the local
install entirely. Nothing else changes.

## Layout

- `server/` — Express API. `src/db.js` holds the pool, `tx()`, and the migration runner; SQL migrations live in `src/migrations/`.
- `client/` — Vite React app. The dev server proxies `/api` and `/uploads` to the API, so URLs stay relative.
- `data/uploads/` — uploaded photos on disk (gitignored, Phase 5).

## Security

The API binds to `127.0.0.1` and has no auth by design. Postgres ships with
`listen_addresses = 'localhost'`, so the database is not reachable from the LAN either. Exposing
either one beyond localhost requires adding auth, HTTPS, and rate limits first.
