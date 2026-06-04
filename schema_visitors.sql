-- App-owned analytics table for the visitor counter (Phase 11).
-- Kept SEPARATE from schema.sql on purpose: schema.sql drops + recreates the
-- upstream pipeline tables on every reseed, and this data must survive that.
-- Idempotent: safe to re-run; never dropped.

CREATE TABLE IF NOT EXISTS visitors (
  visitor_hash TEXT NOT NULL,   -- SHA-256(ip + VISITOR_SALT), stable per IP
  day          TEXT NOT NULL,   -- 'YYYY-MM-DD' (UTC)
  PRIMARY KEY (visitor_hash, day)
);

CREATE INDEX IF NOT EXISTS idx_visitors_day ON visitors(day);
