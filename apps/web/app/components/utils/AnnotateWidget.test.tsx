import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { init, destroy, refresh } = vi.hoisted(() => ({
  init: vi.fn(),
  destroy: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@webdots/annotate-client', () => ({ init, destroy }))
vi.mock('next/navigation', () => ({ usePathname: () => '/nosotros' }))

/**
 * The component reads its configuration at module scope, the way Next inlines
 * `NEXT_PUBLIC_*` at build time, so each case needs a fresh module registry
 * rather than a stub applied after import.
 */
async function renderWidget() {
  vi.resetModules()
  const { AnnotateWidget } = await import('./AnnotateWidget')

  return render(<AnnotateWidget />)
}

beforeEach(() => {
  init.mockReturnValue({ refresh })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('AnnotateWidget', () => {
  test('stays inert when no annotation API is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_API_URL', '')

    await renderWidget()

    // This is what keeps the QA widget out of production: the image is built
    // without the URL, so there is nothing to turn on afterwards.
    expect(init).not.toHaveBeenCalled()
  })

  test('stays inert when it is explicitly disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_API_URL', 'https://qa.example.com/api/v1')
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_DISABLED', 'true')

    await renderWidget()

    expect(init).not.toHaveBeenCalled()
  })

  test('mounts against the configured API when it is enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_API_URL', 'https://qa.example.com/api/v1')
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_API_KEY', 'qa-key')
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_DISABLED', 'false')

    await renderWidget()

    expect(init).toHaveBeenCalledWith({
      apiUrl: 'https://qa.example.com/api/v1',
      apiKey: 'qa-key',
    })
    expect(refresh).toHaveBeenCalled()
  })

  test('renders no markup of its own', async () => {
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_API_URL', 'https://qa.example.com/api/v1')

    const { container } = await renderWidget()

    expect(container).toBeEmptyDOMElement()
  })

  test('frees the library singleton when it unmounts', async () => {
    vi.stubEnv('NEXT_PUBLIC_WEBDOTS_API_URL', 'https://qa.example.com/api/v1')

    const { unmount } = await renderWidget()
    unmount()

    // The module level destroy(), not widget.destroy(): the instance method
    // leaves the singleton in place and the next init() returns a dead widget.
    expect(destroy).toHaveBeenCalled()
  })
})
