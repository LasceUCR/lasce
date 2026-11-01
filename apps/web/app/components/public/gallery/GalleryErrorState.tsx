import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'

export interface GalleryErrorStateProps {
  onRetry: () => void
}

/**
 * Rendered by `/galeria`'s `error.tsx` when `getGalleryAlbums` throws, in place of the skeleton
 * or the albums it never loaded. `onRetry` is Next's own `reset()`, which re-renders the route
 * and tries the request again.
 */
export function GalleryErrorState({ onRetry }: GalleryErrorStateProps) {
  return (
    <article className="topic-page">
      <div className="topic-page-footer page-width">
        <Notice role="alert" tone="error">
          No se pudo cargar la galería. Inténtelo de nuevo.
        </Notice>
        <Button onClick={onRetry} variant="secondary">
          Reintentar
        </Button>
      </div>
    </article>
  )
}
