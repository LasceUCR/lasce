import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import {
  ResourceDownloadActions,
  type ResourceDownloadActionsProps,
} from './ResourceDownloadActions'
import {
  AllAllowed,
  Failed,
  GoesDataForbidden,
  ImageOnly,
  NothingOffered,
  Preparing,
  Ready,
  SignedOut,
} from './ResourceDownloadActions.stories'

const args = (story: { args?: Partial<ResourceDownloadActionsProps> }) =>
  story.args as ResourceDownloadActionsProps

describe('ResourceDownloadActions', () => {
  test('offers each allowed format and reports the one chosen', async () => {
    const onDownload = vi.fn()
    const user = userEvent.setup()
    render(<ResourceDownloadActions {...args(AllAllowed)} onDownload={onDownload} />)

    expect(screen.getByRole('heading', { name: 'Descargas' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descargar datos (CSV)' }))

    expect(onDownload).toHaveBeenCalledWith('csv')
  })

  test('hides a format the user may not download', () => {
    render(<ResourceDownloadActions {...args(GoesDataForbidden)} />)

    expect(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Descargar datos (CSV)' })).not.toBeInTheDocument()
  })

  test('invites an anonymous visitor to sign in for the chart and does not advertise data', async () => {
    const onDownload = vi.fn()
    const user = userEvent.setup()
    render(<ResourceDownloadActions {...args(SignedOut)} onDownload={onDownload} />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    await user.click(
      screen.getByRole('button', { name: 'Inicie sesión para descargar la gráfica' }),
    )

    expect(onDownload).toHaveBeenCalledWith('png')
  })

  test('shows only the formats the product offers', () => {
    render(<ResourceDownloadActions {...args(ImageOnly)} />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeInTheDocument()
  })

  test('blocks every button while a file is being prepared', () => {
    render(<ResourceDownloadActions {...args(Preparing)} />)

    expect(screen.getByRole('button', { name: 'Preparando descarga…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descargar gráfica (PNG)' })).toBeDisabled()
  })

  test('announces a started download as a status and a failure as an alert', () => {
    const { rerender } = render(<ResourceDownloadActions {...args(Ready)} />)
    expect(screen.getByRole('status')).toHaveTextContent('El enlace vence en 30 minutos.')

    rerender(<ResourceDownloadActions {...args(Failed)} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible preparar la descarga.')
  })

  test('renders nothing when the product offers no download', () => {
    const { container } = render(<ResourceDownloadActions {...args(NothingOffered)} />)

    expect(container).toBeEmptyDOMElement()
  })

  test('renders nothing for a signed-in user who may download none of the formats', () => {
    const { container } = render(<ResourceDownloadActions {...args(SignedOut)} signedIn />)

    expect(container).toBeEmptyDOMElement()
  })
})
