'use server'

import { userHasPermission } from '@/app/lib/auth/authorization'
import { ROSAC_IMAGE_UPLOAD_VALIDATION } from '@/app/lib/rosac-upload'
import { assetStorage } from '@/app/services/container'
import { InvalidFileSizeError, InvalidFileTypeError } from '@/app/services/storage'

function getImageValidationError(error: unknown): string | null {
  if (error instanceof InvalidFileSizeError) return 'El archivo no debe superar 10 MB.'
  if (error instanceof InvalidFileTypeError)
    return 'Solo se permiten archivos JPG, PNG, WebP, AVIF o SVG.'
  return null
}

export type UploadResearcherImageResult =
  { ok: true; imageUrl: string } | { ok: false; error: string }

async function uploadResearcherImageWithValidation(
  formData: FormData,
  validation?: typeof ROSAC_IMAGE_UPLOAD_VALIDATION,
): Promise<UploadResearcherImageResult> {
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
    const objectKey = await assetStorage.createUpload(file, undefined, validation)
    return { ok: true, imageUrl: assetStorage.getPublicUrl(objectKey) }
  } catch (error) {
    if (validation) {
      const validationError = getImageValidationError(error)
      if (validationError) return { ok: false, error: validationError }
    } else if (error instanceof InvalidFileSizeError || error instanceof InvalidFileTypeError) {
      return { ok: false, error: error.message }
    }
    throw error
  }
}

/**
 * Uploads a researcher's portrait to the configured bucket and returns its
 * permanent public URL. Requires either `create_components` or
 * `edit_components`, since `ResearcherForm` calls this for both a new
 * profile and an edit.
 */
export async function uploadResearcherImage(
  formData: FormData,
): Promise<UploadResearcherImageResult> {
  return uploadResearcherImageWithValidation(formData)
}

export async function uploadRosacResearcherImage(
  formData: FormData,
): Promise<UploadResearcherImageResult> {
  return uploadResearcherImageWithValidation(formData, ROSAC_IMAGE_UPLOAD_VALIDATION)
}

export type UploadConstructionStageImageResult =
  { ok: true; imageUrl: string } | { ok: false; error: string }

export async function uploadConstructionStageImage(
  formData: FormData,
): Promise<UploadConstructionStageImageResult> {
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
    const objectKey = await assetStorage.createUpload(
      file,
      undefined,
      ROSAC_IMAGE_UPLOAD_VALIDATION,
    )
    return { ok: true, imageUrl: assetStorage.getPublicUrl(objectKey) }
  } catch (error) {
    const validationError = getImageValidationError(error)
    if (validationError) return { ok: false, error: validationError }
    throw error
  }
}

export type UploadInstrumentImageResult =
  { ok: true; imageUrl: string } | { ok: false; error: string }

export async function uploadInstrumentImage(
  formData: FormData,
): Promise<UploadInstrumentImageResult> {
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
    const objectKey = await assetStorage.createUpload(
      file,
      undefined,
      ROSAC_IMAGE_UPLOAD_VALIDATION,
    )
    return { ok: true, imageUrl: assetStorage.getPublicUrl(objectKey) }
  } catch (error) {
    const validationError = getImageValidationError(error)
    if (validationError) return { ok: false, error: validationError }
    throw error
  }
}

export type UploadAcknowledgmentLogoResult =
  { ok: true; imageUrl: string } | { ok: false; error: string }

export async function uploadAcknowledgmentLogo(
  formData: FormData,
): Promise<UploadAcknowledgmentLogoResult> {
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
    const objectKey = await assetStorage.createUpload(
      file,
      undefined,
      ROSAC_IMAGE_UPLOAD_VALIDATION,
    )
    return { ok: true, imageUrl: assetStorage.getPublicUrl(objectKey) }
  } catch (error) {
    const validationError = getImageValidationError(error)
    if (validationError) return { ok: false, error: validationError }
    throw error
  }
}
