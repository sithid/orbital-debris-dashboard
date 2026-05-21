#!/usr/bin/env bash
# Seed the local D1 database from the upstream orbital_debris.db.
#
# Usage:
#   ./scripts/seed.sh                # uses default SOURCE_DB path
#   SOURCE_DB=/path/to/db.db ./scripts/seed.sh
#   ./scripts/seed.sh --remote       # seed the deployed D1 (slow, costs writes)
#
# Requirements: sqlite3 CLI, npm/npx, wrangler.

set -euo pipefail

SOURCE_DB="${SOURCE_DB:-E:/repos/orbital-debris-assessment/data/clean/orbital_debris.db}"
TARGET="${1:---local}"   # --local (default) or --remote

if [[ "$TARGET" != "--local" && "$TARGET" != "--remote" ]]; then
  echo "error: target must be --local or --remote (got: $TARGET)" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_DB" ]]; then
  echo "error: SOURCE_DB not found at $SOURCE_DB" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$ROOT/.tmp"
DATA_SQL="$TMP_DIR/seed-data.sql"

mkdir -p "$TMP_DIR"

echo "==> Applying schema to D1 ($TARGET)..."
npx wrangler d1 execute DB "$TARGET" --yes --file="$ROOT/schema.sql"

echo "==> Dumping INSERTs from $SOURCE_DB..."
# .dump emits CREATE/INSERT/BEGIN/COMMIT. We already applied the schema,
# so keep only the INSERT rows.
sqlite3 "$SOURCE_DB" .dump | grep -E '^INSERT' > "$DATA_SQL"

ROW_COUNT=$(wc -l < "$DATA_SQL" | tr -d ' ')
echo "==> Importing $ROW_COUNT rows into D1 ($TARGET)... (this can take a minute)"
npx wrangler d1 execute DB "$TARGET" --yes --file="$DATA_SQL"

echo "==> Done."
