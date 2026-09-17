'use server'

import { userHasPermission } from '@/app/lib/auth/authorization'
import { assetStorage } from '@/app/services/container'
import { InvalidFileSizeError, InvalidFileTypeError } from '@/app/services/storage'

export type UploadNewsImageResult = { ok: true; imageUrl: string } | { ok: false; error: string }

/**
 * Uploads a news article's image to the configured bucket and returns its
 * permanent public URL. Requires
 * either `create_components` or `edit_components`, since `NewsArticleForm`
 * calls this for both a new article and an edit.
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
    if (error instanceof InvalidFileSizeError || error instanceof InvalidFileTypeError) {
      return { ok: false, error: error.message }
    }
    throw error
  }
}
