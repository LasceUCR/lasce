import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { NosotrosActivityForm, type NosotrosActivityFormProps } from './NosotrosActivityForm'
import { Create, Default, Legacy } from './NosotrosActivityForm.stories'

const defaultArgs = Default.args as NosotrosActivityFormProps
const createArgs = Create.args as NosotrosActivityFormProps
const legacyArgs = Legacy.args as NosotrosActivityFormProps

type User = ReturnType<typeof userEvent.setup>

function tab(name: RegExp) {
  return screen.getByRole('tab', { name })
}

/** A field's accessible name also carries its error message, so match on the label's start. */
function field(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

async function replace(user: User, name: string, value: string) {
  const input = field(name)
  await user.clear(input)
  if (value) await user.type(input, value)
}

describe('NosotrosActivityForm: tabs and pre-filled values', () => {
  test('opens on the Spanish tab with the stored Spanish text', () => {
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('combobox', { name: 'Ícono' })).toHaveValue('sun')
    expect(field('Título (Español)')).toHaveValue('Fenómenos solares eruptivos')
    expect(field('Descripción (Español)')).toHaveValue(
      defaultArgs.editing?.content.es.description,
    )
    expect(screen.queryByRole('textbox', { name: /^Título \(English\)/ })).not.toBeInTheDocument()
  })

  test('shows the English text on the English tab', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} />)

    await user.click(tab(/^English/))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveValue('Eruptive solar phenomena')
  })

  test('keeps what was typed when switching tabs', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} />)

    await replace(user, 'Título (Español)', 'Otro título')
    await user.click(tab(/^English/))
    await user.click(tab(/^Español/))

    expect(field('Título (Español)')).toHaveValue('Otro título')
  })

  test('keeps the icon outside the tabs', () => {
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} />)

    const panel = screen.getByRole('tabpanel')
    expect(within(panel).queryByRole('combobox', { name: 'Ícono' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ícono' })).toBeInTheDocument()
  })

  test('marks each text field with the language of its text', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} />)

    expect(field('Título (Español)')).toHaveAttribute('lang', 'es')

    await user.click(tab(/^English/))
    expect(field('Título (English)')).toHaveAttribute('lang', 'en')
  })
})

describe('NosotrosActivityForm: cancelling', () => {
  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('asks before discarding unsaved changes and closes once confirmed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onCancel={onCancel} />)

    await user.type(field('Título (Español)'), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = screen.getByRole('dialog', { name: 'Descartar cambios no guardados' })
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('keeps the form open when discard is dismissed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onCancel={onCancel} />)

    await user.type(field('Título (Español)'), ' editado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).not.toBeInTheDocument()
  })
})

describe('NosotrosActivityForm: creating', () => {
  test('shows a field error and flags the English tab when only Spanish is filled in', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...createArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'Actividad nueva')
    await user.type(field('Descripción (Español)'), 'Texto de prueba')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('El título en inglés es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La descripción en inglés es obligatoria.')).toBeInTheDocument()
  })

  test('saves both languages straight away, without a confirmation dialog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...createArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'Actividad nueva')
    await user.type(field('Descripción (Español)'), 'Texto de prueba')
    await user.click(tab(/^English/))
    await user.type(field('Título (English)'), 'New activity')
    await user.type(field('Descripción (English)'), 'Test text')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ícono' }), 'waves')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      icon: 'waves',
      content: {
        es: { title: 'Actividad nueva', description: 'Texto de prueba' },
        en: { title: 'New activity', description: 'Test text' },
      },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closes without asking when nothing was typed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...createArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('NosotrosActivityForm: editing', () => {
  test('asks for confirmation before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ícono' }), 'waves')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  test('does not save when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ícono' }), 'waves')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('sends only the icon and the version when only the icon changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ícono' }), 'waves')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      version: '2026-09-17T15:00:00.000Z',
      icon: 'waves',
    })
  })

  test('closes instead of saving when nothing changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onCancel = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onCancel={onCancel} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('sends both languages once each changed field is changed in both', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Nuevo título')
    await user.click(tab(/^English/))
    await replace(user, 'Título (English)', 'New title')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      version: '2026-09-17T15:00:00.000Z',
      content: {
        es: { title: 'Nuevo título', description: defaultArgs.editing?.content.es.description },
        en: { title: 'New title', description: defaultArgs.editing?.content.en?.description },
      },
      confirmedUnchanged: [],
    })
  })

  test('asks to confirm the other language when a field changed in one language only', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Nuevo título')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  test('sends the confirmation once the unchanged language is confirmed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Nuevo título')
    await user.click(tab(/^English/))
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedUnchanged: [{ locale: 'en', field: 'title' }] }),
    )
  })
})

describe('NosotrosActivityForm: legacy card', () => {
  test('explains that the base text may not be Spanish and that English is missing', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NosotrosActivityForm {...legacyArgs} />)

    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
    expect(field('Título (Español)')).toHaveAttribute('lang', '')

    await user.click(tab(/^English/))
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
    expect(field('Título (English)')).toHaveValue('')
  })

  test('saves the icon alone without asking for a translation', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...legacyArgs} onSave={onSave} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ícono' }), 'code')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({ version: '2024-07-30T12:00:00.000Z', icon: 'code' })
  })

  test('asks for the English text when the Spanish text changes', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NosotrosActivityForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Fenómenos solares eruptivos')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('El título en inglés es obligatorio.')).toBeInTheDocument()
  })
})

describe('NosotrosActivityForm: language', () => {
  test('renders its labels in English', () => {
    renderWithIntl(<NosotrosActivityForm {...defaultArgs} />, { locale: 'en' })

    expect(screen.getByRole('combobox', { name: 'Icon' })).toBeInTheDocument()
    expect(field('Title (Español)')).toBeInTheDocument()
    expect(field('Description (Español)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })
})
