import type { ReactNode } from 'react'

type Variant = 'warning' | 'accent' | 'muted'

const variants: Record<Variant, string> = {
  warning: 'bg-warning/15 text-warning',
  accent: 'bg-cyan/20 text-cyan',
  muted: 'bg-surface text-muted',
}

// Small status pill. Color is never the only signal — Badge always wraps a text
// label (DESIGN §5 a11y floor).
export function Badge({
  variant = 'accent',
  className = '',
  children,
}: {
  variant?: Variant
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
