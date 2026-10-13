import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import type { ContactCard } from '@/app/lib/contact-channel-schema'
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

  test('asks before closing a new card, even before anything is typed', async () => {
    const user = userEvent.setup({ delay: null })
    const onCancel = vi.fn()
    renderWithIntl(<ContactChannelForm card={null} onCancel={onCancel} onSave={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  test('asks before closing an existing card', async () => {
    const user = userEvent.setup({ delay: null })
    const onCancel = vi.fn()
    const card: ContactCard = {
      id: 'phone',
      icon: 'phone',
      title: 'Teléfono',
      description: '2511-6566',
      href: null,
      lang: 'es',
      editing: {
        isLegacy: false,
        version: '2026-01-01T00:00:00.000Z',
        content: {
          es: { title: 'Teléfono', description: '2511-6566' },
          en: { title: 'Phone', description: '2511-6566' },
        },
      },
    }
    renderWithIntl(<ContactChannelForm card={card} onCancel={onCancel} onSave={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(dialog).toHaveTextContent(
      'Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados.',
    )

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(onCancel).not.toHaveBeenCalled()
    expect(field('Título')).toHaveValue('Teléfono')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  test('asks to confirm an unchanged translation in the same warning notice', async () => {
    const user = userEvent.setup({ delay: null })
    const card: ContactCard = {
      id: 'instagram',
      icon: 'instagram',
      title: 'Instagram',
      description: '@lasce_ucr',
      href: 'https://hola.com',
      lang: 'es',
      editing: {
        isLegacy: false,
        version: '2026-01-01T00:00:00.000Z',
        content: {
          es: { title: 'Instagram', description: '@lasce_ucr' },
          en: { title: 'Instagram', description: '@lasce_ucr' },
        },
      },
    }
    renderWithIntl(<ContactChannelForm card={card} onCancel={vi.fn()} onSave={vi.fn()} />)

    const description = screen.getAllByRole('textbox', { name: /^Descripción/ })[0]
    await user.clear(description)
    await user.type(description, 'Nuevo texto')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent('Confirme el texto que no cambió en el otro idioma.')
    expect(notice).toHaveClass('ui-notice-warning')
  })

  test('asks from the add card before the modal closes', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithIntl(
      <AddItemCard label="Agregar canal de contacto">
        {({ close }) => <ContactChannelForm card={null} onCancel={close} onSave={vi.fn()} />}
      </AddItemCard>,
    )

    await user.click(screen.getByRole('button', { name: 'Agregar canal de contacto' }))
    await user.type(field('Título'), 'Correo')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar canal de contacto' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  test('asks before discarding a title that was typed', async () => {
    const user = userEvent.setup({ delay: null })
    const onCancel = vi.fn()
    renderWithIntl(<ContactChannelForm card={null} onCancel={onCancel} onSave={vi.fn()} />)

    await user.type(field('Título'), 'Correo')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(onCancel).not.toHaveBeenCalled()
    expect(field('Título')).toHaveValue('Correo')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledOnce()
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
