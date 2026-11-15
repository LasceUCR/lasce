import { screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { FlashToast, type FlashToastProps } from './FlashToast'
import { ErrorTone, PasswordReset } from './FlashToast.stories'
import { ToastProvider } from './ToastProvider'

const passwordResetArgs = PasswordReset.args as FlashToastProps
const errorArgs = ErrorTone.args as FlashToastProps

function renderFlash(props: FlashToastProps) {
  return renderWithIntl(
    <StrictMode>
      <ToastProvider>
        <FlashToast {...props} />
      </ToastProvider>
    </StrictMode>,
  )
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('FlashToast', () => {
  test('shows its message once, even when effects run twice', async () => {
    renderFlash(passwordResetArgs)

    expect(await screen.findAllByText(passwordResetArgs.message)).toHaveLength(1)
  })

  test('removes the parameter that asked for it and keeps the rest of the address', async () => {
    window.history.replaceState(null, '', '/acceso?restablecida=1&tab=iniciar-sesion')

    renderFlash(passwordResetArgs)
    await screen.findByText(passwordResetArgs.message)

    expect(window.location.pathname).toBe('/acceso')
    expect(window.location.search).toBe('?tab=iniciar-sesion')
  })

  test('shows an error toast without touching the address', async () => {
    window.history.replaceState(null, '', '/pagina?x=1')

    renderFlash(errorArgs)

    expect(await screen.findByText(errorArgs.message)).toBeInTheDocument()
    expect(window.location.search).toBe('?x=1')
  })
})
