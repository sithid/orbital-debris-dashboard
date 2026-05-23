import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

type SearchBarProps = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (local !== value) onChange(local)
    }, 250)
    return () => window.clearTimeout(id)
  }, [local, value, onChange])

  return (
    <label className="relative block">
      <span className="sr-only">Search objects</span>
      <MagnifyingGlassIcon
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-faint"
      />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder ?? 'Search by name or NORAD ID'}
        className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-fg placeholder:text-faint focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40"
      />
    </label>
  )
}
