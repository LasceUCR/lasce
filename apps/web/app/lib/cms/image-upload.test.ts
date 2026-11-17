// @vitest-environment node
import { describe, expect, test } from 'vitest'

import { readImageUpload } from './image-upload'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=',
  'base64',
)
const limits = { maxBytes: 1024, accept: 'image/png,image/jpeg' }

/** A multipart request whose body is already in memory, as it arrives from the network. */
async function upload(file?: File | string, headers: Record<string, string> = {}) {
  const data = new FormData()
  if (file !== undefined) data.set('file', file)
  const encoded = new Response(data)
  const body = new Uint8Array(await encoded.arrayBuffer())
  return new Request('http://localhost/upload', {
    method: 'POST',
    body,
    headers: { 'Content-Type': encoded.headers.get('Content-Type')!, ...headers },
  })
}

describe('readImageUpload', () => {
  test('returns the bytes and type of a valid image', async () => {
    const result = await readImageUpload(
      await upload(new File([png], 'pixel.png', { type: 'image/png' })),
      limits,
    )
    expect(result).toEqual({ ok: true, body: png, contentType: 'image/png' })
  })

  test('rejects a missing or empty file', async () => {
    expect(await readImageUpload(await upload(), limits)).toMatchObject({ code: 'missing-file' })
    expect(await readImageUpload(await upload('text'), limits)).toMatchObject({
      code: 'missing-file',
    })
    expect(
      await readImageUpload(await upload(new File([], 'empty.png', { type: 'image/png' })), limits),
    ).toMatchObject({ status: 400, code: 'missing-file' })
    expect(
      await readImageUpload(new Request('http://localhost/upload', { method: 'POST' }), limits),
    ).toMatchObject({ code: 'missing-file' })
  })

  test('rejects a body that is not multipart', async () => {
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      body: 'plain',
      headers: { 'Content-Type': 'multipart/form-data; boundary=x' },
    })
    expect(await readImageUpload(request, limits)).toMatchObject({ code: 'invalid-upload' })
  })

  test('rejects an oversize upload by its declared length, its body or its file', async () => {
    const big = new File([Buffer.alloc(2048)], 'big.png', { type: 'image/png' })
    expect(
      await readImageUpload(
        await upload(big, { 'content-length': String(10 * 1024 * 1024) }),
        limits,
      ),
    ).toMatchObject({ status: 413 })
    expect(await readImageUpload(await upload(big), { ...limits, maxBytes: 1024 })).toMatchObject({
      status: 413,
      code: 'file-too-large',
    })
    const huge = new File([Buffer.alloc(2 * 1024 * 1024)], 'huge.png', { type: 'image/png' })
    expect(await readImageUpload(await upload(huge), limits)).toMatchObject({ status: 413 })
  })

  test('rejects a type outside the list or bytes that do not match the declared type', async () => {
    expect(
      await readImageUpload(
        await upload(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })),
        limits,
      ),
    ).toMatchObject({ status: 415 })
    expect(
      await readImageUpload(await upload(new File([png], 'x.jpg', { type: 'image/jpeg' })), limits),
    ).toMatchObject({ status: 415, code: 'invalid-file-type' })
  })
})
