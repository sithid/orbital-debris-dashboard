export interface ObjectIdentification {
  norad_id: number
  cospar_id: string | null
  object_name: string | null
  satellite_name: string | null
  official_name: string | null
  object_type: string | null
  category: string | null
  ops_status: string | null
  data_status: string | null
  decay_date: string | null
  in_orbit: number | null
  user_category: string | null
}

export interface ObjectOrbital {
  orbit_class: string | null
  orbit_type: string | null
  period_minutes: number | null
  perigee_km: number | null
  apogee_km: number | null
  inclination_degrees: number | null
  eccentricity: number | null
  semi_major_axis_km: number | null
  launch_mass_kg: number | null
  proxy_mass_kg: number | null
  dry_mass_kg: number | null
  power_watts: number | null
  proxy_power_watts: number | null
  rcs: number | null
  rcs_class: string | null
}

export interface ObjectUcs {
  lifetime_years: number | null
  sat_age_years: number | null
  primary_purpose: string | null
  detailed_purpose: string | null
  geo_longitude: number | null
  un_registry: string | null
}

export interface ObjectRisk {
  velocity_kms: number | null
  kinetic_joules: number | null
  is_zombie: number | null
}

export interface ObjectOwnership {
  owner_code: string | null
  owner: string | null
  country_operator: string | null
  users: string | null
  is_commercial: number | null
  is_government: number | null
  is_military: number | null
  is_civil: number | null
  contractor: string | null
  contractor_country: string | null
}

export interface ObjectLaunch {
  launch_id: string | null
  launch_date: string | null
  launch_year: number | null
  launch_site: string | null
}

export interface ObjectDetail {
  identification: ObjectIdentification
  orbital: ObjectOrbital
  ucs: ObjectUcs
  risk: ObjectRisk
  ownership: ObjectOwnership
  launch: ObjectLaunch
}

interface JoinedRow {
  norad_id: number
  cospar_id: string | null
  object_name: string | null
  satellite_name: string | null
  official_name: string | null
  object_type: string | null
  category: string | null
  ops_status: string | null
  data_status: string | null
  decay_date: string | null
  in_orbit: number | null
  user_category: string | null

  orbit_class: string | null
  orbit_type: string | null
  period_minutes: number | null
  perigee_km: number | null
  apogee_km: number | null
  inclination_degrees: number | null
  eccentricity: number | null
  semi_major_axis_km: number | null
  launch_mass_kg: number | null
  proxy_mass_kg: number | null
  dry_mass_kg: number | null
  power_watts: number | null
  proxy_power_watts: number | null
  rcs: number | null
  rcs_class: string | null

  lifetime_years: number | null
  sat_age_years: number | null
  primary_purpose: string | null
  detailed_purpose: string | null
  geo_longitude: number | null
  un_registry: string | null

  velocity_kms: number | null
  kinetic_joules: number | null
  is_zombie: number | null

  owner_code: string | null
  owner: string | null
  country_operator: string | null
  users: string | null
  is_commercial: number | null
  is_government: number | null
  is_military: number | null
  is_civil: number | null
  contractor: string | null
  contractor_country: string | null

  launch_id: string | null
  launch_date: string | null
  launch_year: number | null
  launch_site: string | null
}

export async function getObject(env: Env, noradId: number): Promise<ObjectDetail | null> {
  const sql = `
    SELECT
      s.norad_id,
      s.cospar_id,
      s.object_name,
      s.satellite_name,
      s.official_name,
      s.object_type,
      s.category,
      s.ops_status,
      s.data_status,
      s.decay_date,
      s.in_orbit,
      s.user_category,

      o.orbit_class,
      o.orbit_type,
      o.period_minutes,
      o.perigee_km,
      o.apogee_km,
      o.inclination_degrees,
      o.eccentricity,
      o.semi_major_axis_km,
      o.launch_mass_kg,
      o.proxy_mass_kg,
      o.dry_mass_kg,
      o.power_watts,
      o.proxy_power_watts,
      o.rcs,
      o.rcs_class,

      u.lifetime_years,
      u.sat_age_years,
      u.primary_purpose,
      u.detailed_purpose,
      u.geo_longitude,
      u.un_registry,

      r.velocity_kms,
      r.kinetic_joules,
      r.is_zombie,

      s.owner_code,
      op.owner,
      op.country_operator,
      op.users,
      op.is_commercial,
      op.is_government,
      op.is_military,
      op.is_civil,
      op.contractor,
      op.contractor_country,

      s.launch_id,
      le.launch_date,
      le.launch_year,
      le.launch_site
    FROM satellites s
    LEFT JOIN orbital_data        o  ON o.norad_id   = s.norad_id
    LEFT JOIN ucs_details         u  ON u.norad_id   = s.norad_id
    LEFT JOIN risk_assessment     r  ON r.norad_id   = s.norad_id
    LEFT JOIN ownership_operators op ON op.owner_code = s.owner_code
    LEFT JOIN launch_events       le ON le.launch_id  = s.launch_id
    WHERE s.norad_id = ?
  `

  const row = await env.DB.prepare(sql).bind(noradId).first<JoinedRow>()
  if (!row) return null

  return {
    identification: {
      norad_id: row.norad_id,
      cospar_id: row.cospar_id,
      object_name: row.object_name,
      satellite_name: row.satellite_name,
      official_name: row.official_name,
      object_type: row.object_type,
      category: row.category,
      ops_status: row.ops_status,
      data_status: row.data_status,
      decay_date: row.decay_date,
      in_orbit: row.in_orbit,
      user_category: row.user_category,
    },
    orbital: {
      orbit_class: row.orbit_class,
      orbit_type: row.orbit_type,
      period_minutes: row.period_minutes,
      perigee_km: row.perigee_km,
      apogee_km: row.apogee_km,
      inclination_degrees: row.inclination_degrees,
      eccentricity: row.eccentricity,
      semi_major_axis_km: row.semi_major_axis_km,
      launch_mass_kg: row.launch_mass_kg,
      proxy_mass_kg: row.proxy_mass_kg,
      dry_mass_kg: row.dry_mass_kg,
      power_watts: row.power_watts,
      proxy_power_watts: row.proxy_power_watts,
      rcs: row.rcs,
      rcs_class: row.rcs_class,
    },
    ucs: {
      lifetime_years: row.lifetime_years,
      sat_age_years: row.sat_age_years,
      primary_purpose: row.primary_purpose,
      detailed_purpose: row.detailed_purpose,
      geo_longitude: row.geo_longitude,
      un_registry: row.un_registry,
    },
    risk: {
      velocity_kms: row.velocity_kms,
      kinetic_joules: row.kinetic_joules,
      is_zombie: row.is_zombie,
    },
    ownership: {
      owner_code: row.owner_code,
      owner: row.owner,
      country_operator: row.country_operator,
      users: row.users,
      is_commercial: row.is_commercial,
      is_government: row.is_government,
      is_military: row.is_military,
      is_civil: row.is_civil,
      contractor: row.contractor,
      contractor_country: row.contractor_country,
    },
    launch: {
      launch_id: row.launch_id,
      launch_date: row.launch_date,
      launch_year: row.launch_year,
      launch_site: row.launch_site,
    },
  }
}
