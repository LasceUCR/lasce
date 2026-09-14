import { Search } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'

export interface SearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  /** Accessible name for the field; not shown, read by assistive tech. */
  label: string
  placeholder: string
  onSubmit?: () => void
  className?: string
}

export function SearchBar({
  query,
  onQueryChange,
  label,
  placeholder,
  onSubmit,
  className,
}: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit?.()
  }

  return (
    <form
      className={className ? `search-filter-bar ${className}` : 'search-filter-bar'}
      onSubmit={handleSubmit}
      role="search"
    >
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
    </form>
  )
}
