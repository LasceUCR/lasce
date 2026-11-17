import { beforeEach, describe, expect, test, vi } from 'vitest'

const getGalleryPaths = vi.hoisted(() => vi.fn())

vi.mock('./gallery', () => ({ getGalleryPaths }))

const { getPublicPaths, publicPaths } = await import('./site')

beforeEach(() => vi.clearAllMocks())

describe('site', () => {
  test('lists academic activities at their dedicated route, outside news', () => {
    expect(publicPaths).toContain('/noticias')
    expect(publicPaths).toContain('/actividades-academicas')
    expect(publicPaths.some((path) => path.startsWith('/noticias/actividades/'))).toBe(false)
  })

  test('adds the gallery pages found in the database to the static pages', async () => {
    getGalleryPaths.mockResolvedValue(['/galeria/nuevo', '/galeria/nuevo/uno'])

    const paths = await getPublicPaths()

    expect(paths).toEqual([...publicPaths, '/galeria/nuevo', '/galeria/nuevo/uno'])
  })

  test('leaves out an album that no longer exists', async () => {
    getGalleryPaths.mockResolvedValue([])

    expect(await getPublicPaths()).not.toContain('/galeria/rosac')
  })
})
