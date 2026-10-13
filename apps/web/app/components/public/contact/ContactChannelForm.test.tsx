import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ContactChannelForm } from './ContactChannelForm'

async function chooseSymbol(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', { name: 'Símbolo' }))
  await user.click(screen.getByRole('option', { name }))
}

function field(label: string) {
  return screen.getByRole('textbox', { name: new RegExp(`^${label}`) })
}

describe('ContactChannelForm', () => {
  test('asks for the symbol first, then the title and the description', () => {
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={vi.fn()} />)

    const symbol = screen.getByRole('combobox', { name: 'Símbolo' })
    const title = field('Título')
    const description = field('Descripción')

    expect(symbol.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(
      title.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Enlace' })).not.toBeInTheDocument()
  })

  test('offers a link only for Instagram and Facebook and sends it with both languages', async () => {
    const user = userEvent.setup({ delay: null })
    const onSave = vi.fn()
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={onSave} />)

    await chooseSymbol(user, 'Instagram')
    await user.type(field('Título'), 'Instagram')
    await user.type(field('Descripción'), '@lasce_ucr')
    await user.type(field('Enlace'), 'https://www.instagram.com/lasce_ucr/')
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.type(field('Título'), 'Instagram')
    await user.type(field('Descripción'), '@lasce_ucr')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'instagram',
        href: 'https://www.instagram.com/lasce_ucr/',
        content: {
          es: { title: 'Instagram', description: '@lasce_ucr' },
          en: { title: 'Instagram', description: '@lasce_ucr' },
        },
      }),
    )
  })

  test('hides the link again when the symbol is not a social network', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={vi.fn()} />)

    await chooseSymbol(user, 'Facebook')
    expect(field('Enlace')).toBeInTheDocument()

    await chooseSymbol(user, 'Correo')
    expect(screen.queryByRole('textbox', { name: 'Enlace' })).not.toBeInTheDocument()
  })
})
