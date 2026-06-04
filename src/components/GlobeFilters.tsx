// Filter option lists mirror src/pages/Objects.tsx so the globe and the table
// agree on what each filter offers.
const OBJECT_TYPES = ['PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN', 'TBA']
const ORBIT_CLASSES = ['LEO', 'MEO', 'GEO', 'HEO', 'UNKNOWN']

const selectClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40'

type Props = {
  objectType: string
  orbitClass: string
  onObjectTypeChange: (value: string) => void
  onOrbitClassChange: (value: string) => void
}

export function GlobeFilters({
  objectType,
  orbitClass,
  onObjectTypeChange,
  onOrbitClassChange,
}: Props) {
  return (
    <div className="pointer-events-auto rounded-lg border border-border bg-surface/85 p-4 shadow-lg backdrop-blur">
      <p className="text-xs uppercase tracking-widest text-muted">Filters</p>
      <div className="mt-2 space-y-2">
        <label className="block">
          <span className="sr-only">Object type</span>
          <select
            value={objectType}
            onChange={(e) => onObjectTypeChange(e.target.value)}
            className={selectClass}
            aria-label="Filter by object type"
          >
            <option value="">All types</option>
            {OBJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Orbit class</span>
          <select
            value={orbitClass}
            onChange={(e) => onOrbitClassChange(e.target.value)}
            className={selectClass}
            aria-label="Filter by orbit class"
          >
            <option value="">All orbits</option>
            {ORBIT_CLASSES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
