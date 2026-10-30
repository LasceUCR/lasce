'use server'

import { userHasPermission } from '@/app/lib/auth/authorization'
import { assetStorage } from '@/app/services/container'
import { InvalidFileSizeError, InvalidFileTypeError } from '@/app/services/storage'

export type UploadAcademicActivityImageResult =
  { ok: true; imageUrl: string } | { ok: false; error: string }

/**
 * Uploads an academic activity's image to the configured bucket and returns its permanent public
 * URL. Requires either `create_components` or `edit_components`, since `AcademicActivityForm`
 * calls this for both a new activity and an edit.
 */
export async function uploadAcademicActivityImage(
  formData: FormData,
): Promise<UploadAcademicActivityImageResult> {
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
