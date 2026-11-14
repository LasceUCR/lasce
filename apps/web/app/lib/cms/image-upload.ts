import { imageExtension } from '@/app/services/cms-images/imageStorage'

export type ImageUploadFailure =
  | { ok: false; status: 400; code: 'invalid-upload' | 'missing-file' }
  | { ok: false; status: 413; code: 'file-too-large' }
  | { ok: false; status: 415; code: 'invalid-file-type' }

export type ImageUploadResult = { ok: true; body: Buffer; contentType: string } | ImageUploadFailure

/**
 * Read the `file` field of a multipart image upload, bounding the request body before parsing it
 * and checking the declared type against both `accept` and the file's signature.
 */
export async function readImageUpload(
  request: Request,
  { maxBytes, accept }: { maxBytes: number; accept: string },
): Promise<ImageUploadResult> {
  // Leave room for multipart headers while bounding the body before parsing it.
  const maxBody = maxBytes + 1024 * 1024
  if (Number(request.headers.get('content-length')) > maxBody) {
    return { ok: false, status: 413, code: 'file-too-large' }
  }
  let data: FormData
  try {
    if (!request.body) return { ok: false, status: 400, code: 'missing-file' }
    const chunks: Uint8Array[] = []
    let size = 0
    const reader = request.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > maxBody) {
          await reader.cancel()
          return { ok: false, status: 413, code: 'file-too-large' }
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    data = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: request.headers,
    }).formData()
  } catch {
    return { ok: false, status: 400, code: 'invalid-upload' }
  }
  const file = data.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, status: 400, code: 'missing-file' }
  }
  if (file.size > maxBytes) return { ok: false, status: 413, code: 'file-too-large' }
  if (!accept.split(',').includes(file.type)) {
    return { ok: false, status: 415, code: 'invalid-file-type' }
  }
  const body = Buffer.from(await file.arrayBuffer())
  if (!imageExtension(body, file.type)) {
    return { ok: false, status: 415, code: 'invalid-file-type' }
  }
  return { ok: true, body, contentType: file.type }
}
