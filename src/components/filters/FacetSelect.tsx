import { fieldClass } from './fieldStyles'

type Option = { value: string; label: string }

// A labelled dropdown whose options come from the facets endpoint (owner /
// country). `allLabel` is the empty-value option (e.g. "All owners").
export function FacetSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string
  allLabel: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
        aria-label={label}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
