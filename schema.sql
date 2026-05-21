-- D1 schema for the orbital debris dashboard.
-- Mirrors the upstream pipeline schema in
-- orbital-debris-assessment/data/clean/orbital_debris.db, with primary keys
-- and indexes added for query performance.
--
-- Idempotent: safe to re-run; existing tables are dropped.

DROP TABLE IF EXISTS satellites;
DROP TABLE IF EXISTS orbital_data;
DROP TABLE IF EXISTS ucs_details;
DROP TABLE IF EXISTS risk_assessment;
DROP TABLE IF EXISTS ownership_operators;
DROP TABLE IF EXISTS launch_events;

CREATE TABLE satellites (
  norad_id      INTEGER PRIMARY KEY,
  cospar_id     TEXT,
  object_name   TEXT,
  satellite_name TEXT,
  official_name TEXT,
  object_type   TEXT,
  category      TEXT,
  ops_status    TEXT,
  data_status   TEXT,
  decay_date    TEXT,
  in_orbit      INTEGER,
  owner_code    TEXT,
  launch_id     TEXT,
  user_category TEXT
);

CREATE INDEX idx_satellites_object_name ON satellites(object_name);
CREATE INDEX idx_satellites_owner_code  ON satellites(owner_code);
CREATE INDEX idx_satellites_launch_id   ON satellites(launch_id);
CREATE INDEX idx_satellites_in_orbit    ON satellites(in_orbit);
CREATE INDEX idx_satellites_object_type ON satellites(object_type);

CREATE TABLE orbital_data (
  norad_id            INTEGER PRIMARY KEY,
  orbit_class         TEXT,
  orbit_type          TEXT,
  period_minutes      REAL,
  perigee_km          REAL,
  apogee_km           REAL,
  inclination_degrees REAL,
  eccentricity        REAL,
  semi_major_axis_km  REAL,
  launch_mass_kg      REAL,
  proxy_mass_kg       REAL,
  dry_mass_kg         REAL,
  power_watts         REAL,
  proxy_power_watts   REAL,
  rcs                 REAL,
  rcs_class           TEXT
);

CREATE INDEX idx_orbital_data_orbit_class ON orbital_data(orbit_class);

CREATE TABLE ucs_details (
  norad_id         INTEGER PRIMARY KEY,
  lifetime_years   REAL,
  sat_age_years    REAL,
  primary_purpose  TEXT,
  detailed_purpose TEXT,
  geo_longitude    REAL,
  un_registry      TEXT
);

CREATE TABLE risk_assessment (
  norad_id        INTEGER PRIMARY KEY,
  velocity_kms    REAL,
  kinetic_joules  REAL,
  is_zombie       INTEGER
);

CREATE INDEX idx_risk_assessment_is_zombie ON risk_assessment(is_zombie);

CREATE TABLE ownership_operators (
  owner_code         TEXT PRIMARY KEY,
  owner              TEXT,
  country_operator   TEXT,
  users              TEXT,
  is_commercial      INTEGER,
  is_government      INTEGER,
  is_military        INTEGER,
  is_civil           INTEGER,
  contractor         TEXT,
  contractor_country TEXT
);

CREATE TABLE launch_events (
  launch_id    TEXT PRIMARY KEY,
  launch_date  TEXT,
  launch_year  INTEGER,
  launch_site  TEXT
);

CREATE INDEX idx_launch_events_launch_year ON launch_events(launch_year);
