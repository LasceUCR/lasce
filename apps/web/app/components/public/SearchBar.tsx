import { Search } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'

export interface SearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  /** Accessible name for the field; not shown, read by assistive tech. */
  label: string
  placeholder: string
  submitLabel?: string
  onSubmit?: () => void
}

export function SearchBar({
  query,
  onQueryChange,
  label,
  placeholder,
  submitLabel = 'Buscar',
  onSubmit,
}: SearchBarProps) {
  // Callers that filter live as the field changes don't need this to do
  // anything beyond stopping a full-page navigation on Enter; onSubmit is
  // there for the ones that do want an explicit submit action.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit?.()
  }

  return (
    <form className="search-filter-bar" onSubmit={handleSubmit} role="search">
      <label className="search-filter-field">
        <span className="sr-only">{label}</span>
        <Search aria-hidden="true" size={18} strokeWidth={1.8} />
        <input
          onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={query}
        />
      </label>

      <button className="button button-primary button-compact" type="submit">
        <Search aria-hidden="true" size={16} strokeWidth={2} />
        {submitLabel}
      </button>
    </form>
  )
}
