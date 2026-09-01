# Garden Plants Dashboard

Multi-user garden plant tracker: React (Vite) client, Express API, Postgres 16, Clerk auth, deployed on Render.

## Requirements

- Node 20+
- Postgres 16 (local Homebrew or managed)
- [Clerk](https://dashboard.clerk.com) application (test keys for local dev)

## Local setup

Install Postgres and create the database:

```bash
brew install postgresql@16
brew services start postgresql@16

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
psql -d postgres -c "CREATE ROLE plants LOGIN PASSWORD 'plants'"
createdb -O plants plants
```

Configure environment and run:

```bash
cp .env.example .env
# Add Clerk test keys from dashboard.clerk.com to .env
npm install
npm run dev               # API :3001, client :5173
```

Open http://127.0.0.1:5173, sign up/in via Clerk, then add plants.

Migrations run on server start; `npm run migrate` applies them without booting the API.

### Seed sample data

After signing in once, copy your Clerk user id from the dashboard or JWT, then:

```bash
SEED_OWNER_ID=user_xxxx npm run seed
```

## Deploy on Render

1. Push this repo to GitHub and connect it in Render.
2. Use the included [`render.yaml`](render.yaml) blueprint, or create:
   - **Web Service** (Docker) from the [`Dockerfile`](Dockerfile)
   - **Postgres** database linked as `DATABASE_URL`
   - **Persistent disk** (10 GB) mounted at `/data/uploads`
3. Set environment variables:
   - `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (production Clerk app)
   - `GEMINI_API_KEY` (for photo diagnosis)
   - `VISION_MODEL=gemini-3.6-flash`
   - `NODE_ENV=production`
   - `UPLOADS_DIR=/data/uploads`
4. In Clerk, allow your Render URL (`https://<app>.onrender.com`) as an authorized origin.
5. Pass `VITE_CLERK_PUBLISHABLE_KEY` as a **Docker build argument** (same value as publishable key) so the client bundle includes it.

Production serves the built SPA and API from one Node process over HTTPS.

## Layout

- `server/` — Express API, migrations, repos, Clerk middleware
- `client/` — Vite React app with Clerk sign-in
- `data/uploads/` — plant photos (gitignored; use persistent disk in production)
- `Dockerfile` / `render.yaml` — Render deployment

## Backup

```bash
npm run migrate   # ensure DB is reachable
bash server/src/scripts/backup.sh
```

Writes a `pg_dump` SQL file and a tarball of `data/uploads/` under `data/backups/`.

## Security

- All `/api/*` routes except `/api/health` require a Clerk session
- Plant data is scoped by `owner_id` (Clerk user id) in Postgres
- Upload and analyze endpoints are rate-limited
- Secrets live in `.env` locally and Render env in production
