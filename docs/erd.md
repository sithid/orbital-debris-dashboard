# Entity Relationship Diagram

_Last regenerated: 2026-05-23 (end of Phase 3). Source of truth: `schema.sql`. Regenerate whenever the schema changes or a phase touches the data model._

## Diagram

```mermaid
erDiagram
    SATELLITES ||--o| ORBITAL_DATA       : "has orbital params"
    SATELLITES ||--o| UCS_DETAILS        : "has UCS record"
    SATELLITES ||--o| RISK_ASSESSMENT    : "has risk record"
    OWNERSHIP_OPERATORS ||--o{ SATELLITES : "owns"
    LAUNCH_EVENTS       ||--o{ SATELLITES : "launched"

    SATELLITES {
        INTEGER norad_id       PK
        TEXT    cospar_id
        TEXT    object_name    "indexed"
        TEXT    satellite_name
        TEXT    official_name
        TEXT    object_type    "indexed"
        TEXT    category
        TEXT    ops_status
        TEXT    data_status
        TEXT    decay_date
        INTEGER in_orbit       "indexed"
        TEXT    owner_code     "FK, indexed"
        TEXT    launch_id      "FK, indexed"
        TEXT    user_category
    }

    ORBITAL_DATA {
        INTEGER norad_id            PK_FK
        TEXT    orbit_class         "indexed"
        TEXT    orbit_type
        REAL    period_minutes
        REAL    perigee_km
        REAL    apogee_km
        REAL    inclination_degrees
        REAL    eccentricity
        REAL    semi_major_axis_km
        REAL    launch_mass_kg
        REAL    proxy_mass_kg
        REAL    dry_mass_kg
        REAL    power_watts
        REAL    proxy_power_watts
        REAL    rcs
        TEXT    rcs_class
    }

    UCS_DETAILS {
        INTEGER norad_id         PK_FK
        REAL    lifetime_years
        REAL    sat_age_years
        TEXT    primary_purpose
        TEXT    detailed_purpose
        REAL    geo_longitude
        TEXT    un_registry
    }

    RISK_ASSESSMENT {
        INTEGER norad_id       PK_FK
        REAL    velocity_kms
        REAL    kinetic_joules
        INTEGER is_zombie      "indexed"
    }

    OWNERSHIP_OPERATORS {
        TEXT    owner_code         PK
        TEXT    owner
        TEXT    country_operator
        TEXT    users
        INTEGER is_commercial
        INTEGER is_government
        INTEGER is_military
        INTEGER is_civil
        TEXT    contractor
        TEXT    contractor_country
    }

    LAUNCH_EVENTS {
        TEXT    launch_id    PK
        TEXT    launch_date
        TEXT    launch_year  "indexed"
        INTEGER launch_site
    }
```

## How the model works

`satellites` is the hub — every other table either *extends* it 1-to-1 (`orbital_data`, `ucs_details`, `risk_assessment`, all keyed by `norad_id` as both PK and FK), or is a *shared reference* it points at 1-to-many (`ownership_operators` via `owner_code`, `launch_events` via `launch_id`). The 1-to-1 split exists because the source pipeline produces these as separate logical groups (SATCAT identification, orbital mechanics, UCS-derived purpose data, derived risk metrics); keeping them in their own tables means a satellite missing UCS data (most non-payload debris) just has no row in `ucs_details` instead of dozens of null columns on `satellites`. The 1-to-many shape for ownership and launch is the right model because one launch deploys many satellites and one operator owns thousands — keying those tables by their natural string IDs avoids the row duplication you'd get keying by `norad_id`. The detail-page route assembles all six tables in a single `LEFT JOIN` so missing optional rows surface as nulls rather than dropping the satellite.

## Decisions that shaped this

1. **Schema mirrors the upstream pipeline, not the UI's display needs.** The shape comes from `orbital-debris-assessment/data/clean/orbital_debris.db`. We seed D1 from that snapshot and treat the pipeline as source of truth for *what fields exist*. The dashboard adapts to the data, not the other way around — if a UI section needs reshaping, we do it in the API layer, not by editing this schema.

2. **1-to-1 extension tables instead of one wide `satellites` table.** Splitting into `orbital_data`, `ucs_details`, `risk_assessment` keeps `satellites` narrow (the indexed columns used by list-page filters: `object_name`, `object_type`, `in_orbit`, `owner_code`, `launch_id`) while still letting the detail route assemble the full profile via `LEFT JOIN` on `norad_id`. Sparse data — e.g. a debris fragment with no UCS record — costs nothing because the row simply doesn't exist.

3. **Ownership and launch keyed by their natural IDs (`owner_code`, `launch_id`), not `norad_id`.** These are genuinely many-to-one relationships: one launch puts dozens of objects in orbit, one operator owns thousands of satellites. Keying these tables by `norad_id` would force duplicating the same operator or launch row per satellite — the exact bug that surfaced during pipeline development. The current shape is properly normalized; the FKs live on `satellites`.

## Out of scope (intentional omissions)

- **No `created_at` / `updated_at` columns.** v1 is a static snapshot. The dashboard reads; it never writes. If v2 adds incremental ingestion or change tracking, this is where audit timestamps land.
- **No soft deletes.** Same reason — read-only catalog, no user-driven mutations.
- **No user / auth tables.** v1 is fully public per PRD §6.
