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
  test('asks for the symbol first, then the title and one phone number', () => {
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={vi.fn()} />)

    const symbol = screen.getByRole('combobox', { name: 'Símbolo' })
    const title = field('Título')
    const number = field('Número')

    expect(symbol.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(title.compareDocumentPosition(number) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: /^Descripción/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Enlace' })).not.toBeInTheDocument()
  })

  test('uses the site language for the editor, including English', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={vi.fn()} />, {
      locale: 'en',
    })

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(field('Title')).toBeInvalid()
    expect(screen.getByText('The English title is required.')).toBeInTheDocument()
    expect(screen.getByText('The number is required.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Español · 1 to review$/ })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Symbol' }))
    await user.click(screen.getByRole('option', { name: 'Email' }))
    const description = field('Description')
    await user.click(description)
    await user.paste('a'.repeat(120))
    await user.type(description, 'b')

    expect(description).toHaveValue('a'.repeat(120))
    expect(screen.getByText('The maximum of 120 characters has been reached.')).toBeInTheDocument()
  })

  test('does not offer a location symbol', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={vi.fn()} />)

    await user.click(screen.getByRole('combobox', { name: 'Símbolo' }))

    expect(screen.queryByRole('option', { name: 'Ubicación' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Teléfono' })).toBeInTheDocument()
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

  test('shows each empty field on its own and flags the other language', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(field('Título')).toBeInvalid()
    expect(field('Número')).toBeInvalid()
    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El número es obligatorio.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^English · 1 por revisar$/ })).toBeInTheDocument()
  })

  test('saves one phone number in both languages and rejects a second', async () => {
    const user = userEvent.setup({ delay: null })
    const onSave = vi.fn()
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={onSave} />)

    await user.type(field('Título'), 'Teléfono')
    await user.type(field('Número'), '2511-6566, 2222-3333')
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.type(field('Título'), 'Phone')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(field('Número')).toBeInvalid()
    expect(screen.getByText('Escriba un solo número de teléfono.')).toBeInTheDocument()

    await user.clear(field('Número'))
    await user.type(field('Número'), '2511-6566')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'phone',
        href: null,
        content: {
          es: { title: 'Teléfono', description: '2511-6566' },
          en: { title: 'Phone', description: '2511-6566' },
        },
      }),
    )
  })

  test('says so only when a 121st character is typed', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={vi.fn()} />)

    await chooseSymbol(user, 'Correo')
    const description = field('Descripción')
    await user.click(description)
    await user.paste('a'.repeat(120))

    expect(description).toHaveValue('a'.repeat(120))
    expect(screen.queryByText('Se alcanzó el máximo de 120 caracteres.')).not.toBeInTheDocument()

    await user.type(description, 'b')

    expect(description).toHaveValue('a'.repeat(120))
    expect(screen.getByText('Se alcanzó el máximo de 120 caracteres.')).toBeInTheDocument()
  })

  test('shows an invalid link on the link field', async () => {
    const user = userEvent.setup({ delay: null })
    const onSave = vi.fn()
    renderWithIntl(<ContactChannelForm card={null} onCancel={vi.fn()} onSave={onSave} />)

    await chooseSymbol(user, 'Instagram')
    await user.type(field('Título'), 'Instagram')
    await user.type(field('Descripción'), '@lasce_ucr')
    await user.click(screen.getByRole('tab', { name: /^English/ }))
    await user.type(field('Título'), 'Instagram')
    await user.type(field('Descripción'), '@lasce_ucr')
    await user.type(field('Enlace'), 'instagram.com/lasce_ucr')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(field('Enlace')).toBeInvalid()
    expect(screen.getByText('El enlace debe empezar por https://.')).toBeInTheDocument()
  })

  test('closes an unchanged card without asking', async () => {
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
    expect(onCancel).toHaveBeenCalledOnce()

    onCancel.mockClear()
    await user.type(field('Título'), ' institucional')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(dialog).toHaveTextContent(
      'Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados.',
    )

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(field('Título')).toHaveValue('Teléfono institucional')
  })

  test('flags the other language until its unchanged text is confirmed', async () => {
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
    if (!description) throw new Error('Expected a description field')
    await user.clear(description)
    await user.type(description, 'Nuevo texto')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByRole('tab', { name: /^English · 1 por revisar$/ })).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'La descripción en inglés sigue siendo correcta' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Actualice este campo o confirme que sigue siendo correcto.'),
    ).toBeInTheDocument()
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
