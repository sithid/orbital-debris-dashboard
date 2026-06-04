import { Eyebrow } from '../atoms/Eyebrow'
import { Select } from '../atoms/Select'

type Option = { value: string; label: string }

// A small labelled select for tri-state filters (zombie, in_orbit). The caller
// supplies the option values/labels because the empty-value meaning differs by
// page (e.g. on the Objects table '' = "All"; the globe defaults to in-orbit).
export function TristateSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <Eyebrow>{label}</Eyebrow>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  )
}
