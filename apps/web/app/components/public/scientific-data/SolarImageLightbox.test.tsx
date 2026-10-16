import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement, type ImgHTMLAttributes } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { SolarImageLightbox, type SolarImageLightboxProps } from './SolarImageLightbox'
import { Default } from './SolarImageLightbox.stories'

vi.mock('next/image', () => ({
  default: ({ alt, src }: ImgHTMLAttributes<HTMLImageElement>) =>
    createElement('img', { alt, src }),
}))

const args = Default.args as SolarImageLightboxProps

function renderLightbox(overrides: Partial<SolarImageLightboxProps> = {}) {
  const handlers = { onClose: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() }
  const view = renderWithIntl(<SolarImageLightbox {...args} {...handlers} {...overrides} />)

  return { ...handlers, ...view }
}

beforeEach(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

describe('SolarImageLightbox', () => {
  test('is a dialog named after the UTC capture time', () => {
    renderLightbox()

    expect(screen.getByRole('dialog')).toHaveAccessibleName('2026-09-10 08:30 UTC')
    expect(screen.getByRole('heading', { level: 2, name: '2026-09-10 08:30 UTC' })).toBeVisible()
  })

  test('describes the image and shows it with its alt text', () => {
    renderLightbox()

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(args.image.alt)
    expect(screen.getByRole('img', { name: args.image.alt })).toBeInTheDocument()
    expect(screen.getByText('GOES · SUVI')).toBeInTheDocument()
  })

  test('places the image within the sequence', () => {
    renderLightbox({ position: 3, total: 5 })

    expect(screen.getByText('3 / 5')).toBeInTheDocument()
    expect(screen.getByText('Imagen 3 de 5')).toBeInTheDocument()
  })

  test('pages and closes through its translated controls', async () => {
    const user = userEvent.setup()
    const { onClose, onPrevious, onNext } = renderLightbox()

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('announces the new image only once it has been paged', async () => {
    const { rerender } = renderLightbox()

    expect(screen.queryByText(/^Imagen 2 de 5:/)).not.toBeInTheDocument()

    rerender(
      <SolarImageLightbox
        {...args}
        image={{ ...args.image, timestamp: '2026-09-10T08:45:00Z' }}
        onClose={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        position={3}
      />,
    )

    expect(await screen.findByText('Imagen 3 de 5: 2026-09-10 08:45 UTC.')).toBeInTheDocument()
  })
})
