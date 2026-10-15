import type { NextResponse } from 'next/server'

import {
  conflict,
  duplicate,
  invalidId as invalidIdResponse,
  notFound as notFoundResponse,
  reviewRequired,
} from '@/app/lib/cms/http'
import type {
  GalleryAlbumWriteFailure,
  GalleryMediaWriteFailure,
  GallerySubAlbumCreateFailure,
} from '@/app/lib/gallery'

/**
 * The responses of `/api/gallery` that speak about albums and media. The envelope, the issue
 * paths and the generic responses (invalid JSON or body, internal error) come from
 * `app/lib/cms/http.ts`; what a conflict or a missing id means here is said here.
 */

export function invalidAlbumId(): NextResponse {
  return invalidIdResponse('El id del álbum no es válido.')
}

export function invalidMediaId(): NextResponse {
  return invalidIdResponse('El id del archivo no es válido.')
}

export function albumNotFound(): NextResponse {
  return notFoundResponse('No existe el álbum indicado.')
}

export function mediaNotFound(): NextResponse {
  return notFoundResponse('No existe el archivo indicado.')
}

/** Maps an expected album write failure to its response. */
export function albumWriteFailure(
  failure: GalleryAlbumWriteFailure | GallerySubAlbumCreateFailure,
): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return albumNotFound()
    case 'parent-not-found':
      return notFoundResponse('No existe el álbum padre indicado.')
    case 'parent-not-top-level':
      return invalidIdResponse('No se pueden crear subálbumes dentro de otro subálbum.')
    case 'conflict':
      return conflict(
        'El álbum cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
      )
    case 'duplicate-slug':
      return duplicate('duplicate-slug', 'Ya existe un álbum con este slug.')
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}

/** Maps an expected media write failure to its response. */
export function mediaWriteFailure(failure: GalleryMediaWriteFailure): NextResponse {
  switch (failure.reason) {
    case 'not-found':
      return mediaNotFound()
    case 'album-not-found':
      return albumNotFound()
    case 'conflict':
      return conflict(
        'El archivo cambió desde que lo abrió o ya existe. Recárguelo y vuelva a aplicar sus cambios.',
      )
    case 'review-required':
      return reviewRequired(failure.pending)
  }
}
