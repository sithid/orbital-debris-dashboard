import { useEffect, useRef, useState } from 'react'
import type { RangeBound } from '../../hooks/useFacets'
import { fieldClass, labelClass } from './fieldStyles'

// A labelled min/max number-input pair. Holds local state and debounces upward
// so typing doesn't refetch on every keystroke; syncs back from props on Reset.
export function RangeInputs({
  label,
  unit,
  min,
  max,
  placeholder,
  step,
  onCommit,
}: {
  label: string
  unit?: string
  min: string
  max: string
  placeholder: RangeBound
  step?: number
  onCommit: (next: { min: string; max: string }) => void
}) {
  const [localMin, setLocalMin] = useState(min)
  const [localMax, setLocalMax] = useState(max)
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
  })

  useEffect(() => setLocalMin(min), [min])
  useEffect(() => setLocalMax(max), [max])

  useEffect(() => {
    if (localMin === min && localMax === max) return
    const t = setTimeout(
      () => onCommitRef.current({ min: localMin.trim(), max: localMax.trim() }),
      250
    )
    return () => clearTimeout(t)
  }, [localMin, localMax, min, max])

  const inputClass = `${fieldClass} px-2 [appearance:textfield]`

  return (
    <div>
      <span className={labelClass}>
        {label}
        {unit ? <span className="lowercase"> ({unit})</span> : null}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          step={step}
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          placeholder={`${placeholder.min}`}
          className={inputClass}
          aria-label={`Minimum ${label}`}
        />
        <span aria-hidden className="text-muted">
          –
        </span>
        <input
          type="number"
          inputMode="numeric"
          step={step}
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          placeholder={`${placeholder.max}`}
          className={inputClass}
          aria-label={`Maximum ${label}`}
        />
      </div>
    </div>
  )
}
