import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { Toast, type ToastProps } from './Toast'
import { Error as ErrorStory, Success } from './Toast.stories'

const successArgs = Success.args as ToastProps
const errorArgs = ErrorStory.args as ToastProps

describe('Toast', () => {
  test('shows its message', () => {
    renderWithIntl(<Toast {...successArgs} />)

    expect(screen.getByText(successArgs.message)).toBeInTheDocument()
  })

  test('calls onDismiss from its close button', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderWithIntl(<Toast {...errorArgs} onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  test('labels the close button in the current language', () => {
    renderWithIntl(<Toast {...successArgs} />, { locale: 'en' })

    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument()
  })
})
