import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  userHasPermission: vi.fn(),
  createUpload: vi.fn(),
  getPublicUrl: vi.fn(),
}))

vi.mock('@/app/lib/auth/authorization', () => ({
  userHasPermission: mocks.userHasPermission,
}))

// The real container builds a MinIO client from the environment when it loads.
vi.mock('@/app/services/container', () => ({
  assetStorage: { createUpload: mocks.createUpload, getPublicUrl: mocks.getPublicUrl },
}))

import { InvalidFileSizeError, InvalidFileTypeError } from '@/app/services/storage'

import { uploadNewsImage } from './actions'

function formWithFile(
  file: File | null = new File(['imagen'], 'nueva.png', { type: 'image/png' }),
) {
  const formData = new FormData()
  if (file) formData.set('file', file)
  return formData
}

function grant(...permissions: string[]) {
  mocks.userHasPermission.mockImplementation(async (permission: string) =>
    permissions.includes(permission),
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('uploadNewsImage', () => {
  test('refuses an account that can neither create nor edit', async () => {
    grant()

    expect(await uploadNewsImage(formWithFile())).toEqual({
      ok: false,
      error: 'No tiene permisos para subir imágenes.',
    })
    expect(mocks.createUpload).not.toHaveBeenCalled()
  })

  test('says so when no file was sent', async () => {
    grant('create_components')

    expect(await uploadNewsImage(formWithFile(null))).toEqual({
      ok: false,
      error: 'No se proporcionó ninguna imagen.',
    })
  })

  test('returns the public URL of the uploaded image', async () => {
    grant('edit_components')
    mocks.createUpload.mockResolvedValue('assets/123_nueva.png')
    mocks.getPublicUrl.mockReturnValue('https://s3.example/lasce/assets/123_nueva.png')

    expect(await uploadNewsImage(formWithFile())).toEqual({
      ok: true,
      imageUrl: 'https://s3.example/lasce/assets/123_nueva.png',
    })
  })

  test('explains a file that is too large in the admin’s terms', async () => {
    grant('create_components')
    mocks.createUpload.mockRejectedValue(new InvalidFileSizeError('nueva.png', 30_000_000))

    expect(await uploadNewsImage(formWithFile())).toEqual({
      ok: false,
      error: 'La imagen supera el tamaño máximo permitido de 25 MB. Elija un archivo más pequeño.',
    })
  })

  test('explains a file that is not a supported image', async () => {
    grant('create_components')
    mocks.createUpload.mockRejectedValue(new InvalidFileTypeError('nueva.bmp', 'image/bmp'))

    expect(await uploadNewsImage(formWithFile())).toEqual({
      ok: false,
      error: 'El archivo no es una imagen compatible. Use una imagen PNG, JPEG, WebP o GIF.',
    })
  })

  test('explains a storage outage instead of throwing', async () => {
    grant('create_components')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createUpload.mockRejectedValue(new Error('connect ECONNREFUSED'))

    expect(await uploadNewsImage(formWithFile())).toEqual({
      ok: false,
      error:
        'No se pudo subir la imagen: el servicio de archivos no respondió. Inténtelo de nuevo en unos minutos.',
    })
  })
})
