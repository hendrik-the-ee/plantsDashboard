#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/data/backups}"
mkdir -p "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/plants-$STAMP.sql"
UPLOADS_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/.env"
    set +a
  fi
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

pg_dump "$DATABASE_URL" > "$DB_FILE"
tar -czf "$UPLOADS_FILE" -C "$ROOT/data" uploads

echo "Wrote $DB_FILE"
echo "Wrote $UPLOADS_FILE"
