import { Search } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'

export interface PublicationSearchBarProps {
  query: string
  onQueryChange: (value: string) => void
}

export function PublicationSearchBar({ query, onQueryChange }: PublicationSearchBarProps) {
  // The list already filters live as the field changes; submitting just
  // avoids a full-page navigation for anyone who presses Enter.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <form className="search-filter-bar" onSubmit={handleSubmit} role="search">
      <label className="search-filter-field">
        <span className="sr-only">Buscar publicaciones</span>
        <Search aria-hidden="true" size={18} strokeWidth={1.8} />
        <input
          onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          placeholder="Buscar por título, autor o palabra clave..."
          type="search"
          value={query}
        />
      </label>

      <button className="button button-primary button-compact" type="submit">
        <Search aria-hidden="true" size={16} strokeWidth={2} />
        Buscar
      </button>
    </form>
  )
}