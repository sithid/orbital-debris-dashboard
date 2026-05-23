import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetailSection, formatValue, type DetailField } from '../components/DetailSection'

type ObjectDetail = {
  identification: {
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
  orbital: {
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
  ucs: {
    lifetime_years: number | null
    sat_age_years: number | null
    primary_purpose: string | null
    detailed_purpose: string | null
    geo_longitude: number | null
    un_registry: string | null
  }
  risk: {
    velocity_kms: number | null
    kinetic_joules: number | null
    is_zombie: number | null
  }
  ownership: {
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
  launch: {
    launch_id: string | null
    launch_date: string | null
    launch_year: number | null
    launch_site: string | null
  }
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: ObjectDetail }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

function yesNo(value: number | null): string {
  if (value === null) return '—'
  return value === 1 ? 'Yes' : 'No'
}

function ownershipFlags(o: ObjectDetail['ownership']): string {
  const flags: string[] = []
  if (o.is_commercial === 1) flags.push('Commercial')
  if (o.is_government === 1) flags.push('Government')
  if (o.is_military === 1) flags.push('Military')
  if (o.is_civil === 1) flags.push('Civil')
  return flags.length > 0 ? flags.join(', ') : '—'
}

export default function ObjectDetail() {
  const { id } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetch(`/api/objects/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setState({ status: 'not-found' })
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as ObjectDetail
        setState({ status: 'ready', data })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load object',
        })
      })
    return () => controller.abort()
  }, [id])

  if (state.status === 'loading') {
    return (
      <section className="mx-auto max-w-6xl px-8 py-10">
        <p className="text-muted">Loading object {id}…</p>
      </section>
    )
  }

  if (state.status === 'not-found') {
    return (
      <section className="mx-auto max-w-6xl px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-muted">Not found</p>
        <h1 className="mt-2 text-3xl font-semibold text-fg">
          No object with NORAD ID <span className="font-mono text-cyan">{id}</span>
        </h1>
        <p className="mt-4 text-muted">
          The catalog does not contain a record for this ID.
        </p>
        <Link
          to="/objects"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm text-fg hover:border-cyan"
        >
          Back to objects
        </Link>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className="mx-auto max-w-6xl px-8 py-10">
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          Couldn't load object: {state.message}
        </p>
      </section>
    )
  }

  const d = state.data
  const heading = d.identification.object_name ?? d.identification.satellite_name ?? `NORAD ${d.identification.norad_id}`
  const isZombie = d.risk.is_zombie === 1

  const identificationFields: DetailField[] = [
    { label: 'NORAD ID', value: d.identification.norad_id, mono: true },
    { label: 'COSPAR ID', value: formatValue(d.identification.cospar_id), mono: true },
    { label: 'Object name', value: formatValue(d.identification.object_name) },
    { label: 'Satellite name', value: formatValue(d.identification.satellite_name) },
    { label: 'Official name', value: formatValue(d.identification.official_name) },
    { label: 'Object type', value: formatValue(d.identification.object_type) },
    { label: 'Category', value: formatValue(d.identification.category) },
    { label: 'Ops status', value: formatValue(d.identification.ops_status) },
    { label: 'Data status', value: formatValue(d.identification.data_status) },
    { label: 'Decay date', value: formatValue(d.identification.decay_date), mono: true },
    { label: 'In orbit', value: yesNo(d.identification.in_orbit) },
    { label: 'User category', value: formatValue(d.identification.user_category) },
  ]

  const orbitalFields: DetailField[] = [
    { label: 'Orbit class', value: formatValue(d.orbital.orbit_class) },
    { label: 'Orbit type', value: formatValue(d.orbital.orbit_type) },
    { label: 'Period (min)', value: formatValue(d.orbital.period_minutes), mono: true },
    { label: 'Perigee (km)', value: formatValue(d.orbital.perigee_km), mono: true },
    { label: 'Apogee (km)', value: formatValue(d.orbital.apogee_km), mono: true },
    { label: 'Inclination (°)', value: formatValue(d.orbital.inclination_degrees), mono: true },
    { label: 'Eccentricity', value: formatValue(d.orbital.eccentricity), mono: true },
    { label: 'Semi-major axis (km)', value: formatValue(d.orbital.semi_major_axis_km), mono: true },
    { label: 'Launch mass (kg)', value: formatValue(d.orbital.launch_mass_kg), mono: true },
    { label: 'Proxy mass (kg)', value: formatValue(d.orbital.proxy_mass_kg), mono: true },
    { label: 'Dry mass (kg)', value: formatValue(d.orbital.dry_mass_kg), mono: true },
    { label: 'Power (W)', value: formatValue(d.orbital.power_watts), mono: true },
    { label: 'Proxy power (W)', value: formatValue(d.orbital.proxy_power_watts), mono: true },
    { label: 'RCS (m²)', value: formatValue(d.orbital.rcs), mono: true },
    { label: 'RCS class', value: formatValue(d.orbital.rcs_class) },
  ]

  const ucsFields: DetailField[] = [
    { label: 'Lifetime (years)', value: formatValue(d.ucs.lifetime_years), mono: true },
    { label: 'Age (years)', value: formatValue(d.ucs.sat_age_years), mono: true },
    { label: 'Primary purpose', value: formatValue(d.ucs.primary_purpose) },
    { label: 'Detailed purpose', value: formatValue(d.ucs.detailed_purpose) },
    { label: 'GEO longitude', value: formatValue(d.ucs.geo_longitude), mono: true },
    { label: 'UN registry', value: formatValue(d.ucs.un_registry), mono: true },
  ]

  const riskFields: DetailField[] = [
    { label: 'Velocity (km/s)', value: formatValue(d.risk.velocity_kms), mono: true },
    { label: 'Kinetic energy (J)', value: formatValue(d.risk.kinetic_joules), mono: true },
    {
      label: 'Zombie',
      value: (
        <span
          className={
            isZombie
              ? 'inline-flex items-center gap-2 rounded-md bg-danger/10 px-2 py-0.5 text-danger'
              : 'inline-flex items-center gap-2 rounded-md bg-success/10 px-2 py-0.5 text-success'
          }
        >
          <span aria-hidden="true">{isZombie ? '⚠' : '✓'}</span>
          {yesNo(d.risk.is_zombie)}
        </span>
      ),
    },
  ]

  const ownershipFields: DetailField[] = [
    { label: 'Owner code', value: formatValue(d.ownership.owner_code), mono: true },
    { label: 'Owner', value: formatValue(d.ownership.owner) },
    { label: 'Country / operator', value: formatValue(d.ownership.country_operator) },
    { label: 'Users', value: formatValue(d.ownership.users) },
    { label: 'Sector', value: ownershipFlags(d.ownership) },
    { label: 'Contractor', value: formatValue(d.ownership.contractor) },
    { label: 'Contractor country', value: formatValue(d.ownership.contractor_country) },
  ]

  const launchFields: DetailField[] = [
    { label: 'Launch ID', value: formatValue(d.launch.launch_id), mono: true },
    { label: 'Launch date', value: formatValue(d.launch.launch_date), mono: true },
    { label: 'Launch year', value: formatValue(d.launch.launch_year), mono: true },
    { label: 'Launch site', value: formatValue(d.launch.launch_site) },
  ]

  return (
    <section className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <Link
          to="/objects"
          className="text-xs uppercase tracking-widest text-muted hover:text-cyan"
        >
          ← Back to objects
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-fg">{heading}</h1>
        <p className="mt-2 font-mono text-sm text-cyan">
          NORAD {d.identification.norad_id}
          {d.identification.cospar_id && (
            <>
              <span className="px-2 text-faint">·</span>
              {d.identification.cospar_id}
            </>
          )}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Identification" fields={identificationFields} />
        <DetailSection title="Orbital parameters" fields={orbitalFields} />
        <DetailSection title="Risk assessment" fields={riskFields} />
        <DetailSection title="UCS details" fields={ucsFields} />
        <DetailSection title="Ownership" fields={ownershipFields} />
        <DetailSection title="Launch" fields={launchFields} />
      </div>
    </section>
  )
}
