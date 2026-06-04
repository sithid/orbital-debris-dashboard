import type { InputHTMLAttributes } from 'react'
import { fieldBase, fieldPadding } from './field'

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${fieldPadding} ${className}`} {...rest} />
}
