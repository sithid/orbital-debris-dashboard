import type { ElementType, ReactNode } from 'react'

// The small uppercase label used as section eyebrows, stat labels, and field
// captions throughout the app. `tone` switches between the two greys in use.
export function Eyebrow({
  as: Tag = 'p',
  tone = 'muted',
  className = '',
  children,
}: {
  as?: ElementType
  tone?: 'muted' | 'faint'
  className?: string
  children: ReactNode
}) {
  const color = tone === 'faint' ? 'text-faint' : 'text-muted'
  return <Tag className={`text-xs uppercase tracking-widest ${color} ${className}`}>{children}</Tag>
}
