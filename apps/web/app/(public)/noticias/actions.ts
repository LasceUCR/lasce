'use server'

import { userHasPermission } from '@/app/lib/auth/authorization'
import { assetStorage } from '@/app/services/container'
import { InvalidFileSizeError, InvalidFileTypeError, MAX_ASSET_BYTES } from '@/app/services/storage'

export type UploadNewsImageResult = { ok: true; imageUrl: string } | { ok: false; error: string }

/**
 * Uploads a news article's image to the configured bucket and returns its
 * permanent public URL. Requires
 * either `create_components` or `edit_components`, since `NewsArticleForm`
 * calls this for both a new article and an edit.
 *
 * Every failure comes back as `{ ok: false, error }` with a reason the form can show, including a
 * storage outage: a thrown error would reach the client as an opaque Server Action failure.
 */
export async function uploadNewsImage(formData: FormData): Promise<UploadNewsImageResult> {
  const [canCreate, canEdit] = await Promise.all([
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
  ])
  if (!canCreate && !canEdit) {
    return { ok: false, error: 'No tiene permisos para subir imágenes.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false, error: 'No se proporcionó ninguna imagen.' }
  }

  try {
    const objectKey = await assetStorage.createUpload(file)
    return { ok: true, imageUrl: assetStorage.getPublicUrl(objectKey) }
  } catch (error) {
    // The storage errors' own messages are English and meant for developers (byte counts, MIME
    // types), so the admin gets the same reason in their terms.
    if (error instanceof InvalidFileSizeError) {
      return {
        ok: false,
        error: `La imagen supera el tamaño máximo permitido de ${MAX_ASSET_BYTES / (1024 * 1024)} MB. Elija un archivo más pequeño.`,
      }
    }
    if (error instanceof InvalidFileTypeError) {
      return {
        ok: false,
        error: 'El archivo no es una imagen compatible. Use una imagen PNG, JPEG, WebP o GIF.',
      }
    }
    console.error('News image upload failed:', error)
    return {
      ok: false,
      error:
        'No se pudo subir la imagen: el servicio de archivos no respondió. Inténtelo de nuevo en unos minutos.',
    }
  }
}
