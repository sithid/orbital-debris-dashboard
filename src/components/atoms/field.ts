// The shared visual base for text inputs and selects — border, surface, text,
// placeholder, and focus ring. Padding is intentionally NOT included so each
// field can set its own (search has icon padding, range inputs are tighter).
export const fieldBase =
  'w-full rounded-lg border border-border bg-surface text-sm text-fg placeholder:text-faint focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40'

// Default padding for standalone fields.
export const fieldPadding = 'px-3 py-2'
