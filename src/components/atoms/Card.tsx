import type { ElementType, ReactNode } from 'react'

// Bordered surface panel. `solid` is the opaque card (stat cards, detail
// sections, table wrapper); `overlay` is the translucent, blurred panel used
// over the globe canvas. Padding is passed via className so layout stays local.
export function Card({
  as: Tag = 'div',
  variant = 'solid',
  className = '',
  children,
}: {
  as?: ElementType
  variant?: 'solid' | 'overlay'
  className?: string
  children: ReactNode
}) {
  const surface =
    variant === 'overlay' ? 'bg-surface/85 shadow-lg backdrop-blur' : 'bg-surface shadow-lg'
  return <Tag className={`rounded-lg border border-border ${surface} ${className}`}>{children}</Tag>
}
