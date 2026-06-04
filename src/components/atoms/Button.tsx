import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'
type Size = 'md' | 'sm'

const base =
  'inline-flex items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-background hover:bg-gold-hover',
  secondary: 'border border-border text-fg hover:border-cyan',
}

const sizes: Record<Size, string> = {
  md: 'px-5 py-3 text-sm',
  sm: 'px-3 py-1.5 text-sm',
}

// Shared so a react-router <Link> can wear the same look without a polymorphic
// component (e.g. the Home/About CTAs).
export function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', className = ''): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...rest} />
}
