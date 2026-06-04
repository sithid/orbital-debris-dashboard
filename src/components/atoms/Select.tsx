import type { SelectHTMLAttributes } from 'react'
import { fieldBase, fieldPadding } from './field'

export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldBase} ${fieldPadding} ${className}`} {...rest}>
      {children}
    </select>
  )
}
