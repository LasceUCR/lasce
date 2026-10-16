import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { Modal } from '@/app/components/public/Modal'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  LasceSectionForm,
  type LasceSectionFormHandle,
  type LasceSectionFormProps,
} from './LasceSectionForm'
import { Default, Legacy, ServerErrors } from './LasceSectionForm.stories'

const editArgs = Default.args as LasceSectionFormProps
const legacyArgs = Legacy.args as LasceSectionFormProps
const serverErrorArgs = ServerErrors.args as LasceSectionFormProps

type User = ReturnType<typeof userEvent.setup>

const discardTitle = 'Descartar cambios no guardados'

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

/** Saving asks for no confirmation: "Confirmar" saves straight away once the form is valid. */
async function save(user: User) {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
}

describe('LasceSectionForm: tabs and pre-filled values', () => {
  test('opens on the Spanish tab with the stored Spanish title and text', () => {
    renderWithIntl(<LasceSectionForm {...editArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (Español)')).toHaveValue('El trabajo de LASCE en Física Solar')
    expect(field('Texto (Español)')).toHaveValue('Primer párrafo.\n\nSegundo párrafo.')
    expect(screen.queryByRole('textbox', { name: /^Título \(English\)/ })).not.toBeInTheDocument()
  })

  test('shows the English text on the English tab', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...editArgs} />)

    await user.click(tab(/^English/))

    expect(field('Título (English)')).toHaveValue("LASCE's work in solar physics")
    expect(field('Texto (English)')).toHaveValue('First paragraph.\n\nSecond paragraph.')
  })

  test('explains that a blank line separates paragraphs', () => {
    renderWithIntl(<LasceSectionForm {...editArgs} />)

    expect(screen.getAllByText('Separe los párrafos con una línea en blanco.')).toHaveLength(2)
  })

  test('keeps what was typed when switching tabs', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...editArgs} />)

    await replace(user, 'Título (Español)', 'Otro título')
    await user.click(tab(/^English/))
    await user.click(tab(/^Español/))

    expect(field('Título (Español)')).toHaveValue('Otro título')
  })
})

describe('LasceSectionForm: in a modal', () => {
  test('puts the language tabs beside the modal title', () => {
    renderWithIntl(
      <Modal onClose={() => {}} open title="Editar la sección de LASCE">
        <LasceSectionForm {...editArgs} />
      </Modal>,
    )

    const header = screen.getByRole('heading', { name: 'Editar la sección de LASCE' }).parentElement
    expect(header).toContainElement(screen.getByRole('tablist'))
  })
})

describe('LasceSectionForm: saving', () => {
  test('hands the draft over once every field is valid', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Texto (Español)', 'Texto nuevo.')
    await user.click(tab(/^English/))
    await replace(user, 'Texto (English)', 'New text.')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      es: { body: 'Texto nuevo.' },
      en: { body: 'New text.' },
    })
    expect(onSave.mock.calls[0]?.[1]).toEqual([])
  })

  test('requires the title and the text in Spanish', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', '')
    await replace(user, 'Texto (Español)', '   ')
    await save(user)

    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El texto en español es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('focuses the first invalid field', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...editArgs} />)

    await replace(user, 'Título (Español)', '')
    await save(user)

    expect(field('Título (Español)')).toHaveFocus()
  })

  test('opens the other tab when that is where the problem is, and flags it', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...editArgs} />)

    await replace(user, 'Título (Español)', 'Título nuevo')
    await user.click(tab(/^English/))
    await replace(user, 'Título (English)', '')
    await user.click(tab(/^Español/))
    await save(user)

    expect(tab(/^English · 1 por revisar$/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveFocus()
  })

  test('rejects a title over 160 characters', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onSave={onSave} />)

    await user.clear(field('Título (Español)'))
    await user.click(field('Título (Español)'))
    await user.paste('a'.repeat(161))
    await save(user)

    expect(
      screen.getByText('El título en español no puede superar 160 caracteres.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('LasceSectionForm: bilingual review', () => {
  test('asks to update or confirm the English title if only the Spanish one changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Título nuevo')
    await user.click(tab(/^English/))

    expect(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    ).not.toBeChecked()

    await save(user)

    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves once the English title is explicitly confirmed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Título nuevo')
    await user.click(tab(/^English/))
    await user.click(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    )
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]?.[1]).toEqual([{ locale: 'en', field: 'title' }])
  })

  test('applies the same rule from English to Spanish', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onSave={onSave} />)

    await user.click(tab(/^English/))
    await replace(user, 'Texto (English)', 'Changed text.')
    await user.click(tab(/^Español/))

    expect(
      screen.getByRole('switch', { name: 'El texto en español sigue siendo correcto' }),
    ).toBeInTheDocument()

    await save(user)

    expect(onSave).not.toHaveBeenCalled()
  })

  test('needs no confirmation when both languages changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Título nuevo')
    await user.click(tab(/^English/))
    await replace(user, 'Título (English)', 'New title')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]?.[1]).toEqual([])
  })

  test('drops a confirmation as soon as either language of that field changes again', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...editArgs} />)

    await replace(user, 'Título (Español)', 'Título nuevo')
    await user.click(tab(/^English/))
    const confirmation = 'El título en inglés sigue siendo correcto'
    await user.click(screen.getByRole('switch', { name: confirmation }))
    expect(screen.getByRole('switch', { name: confirmation })).toBeChecked()

    await user.click(tab(/^Español/))
    await replace(user, 'Título (Español)', 'Otro título')
    await user.click(tab(/^English/))

    expect(screen.getByRole('switch', { name: confirmation })).not.toBeChecked()
  })
})

describe('LasceSectionForm: legacy section', () => {
  test('flags the missing English version and the unknown language of the base text', () => {
    renderWithIntl(<LasceSectionForm {...legacyArgs} />)

    expect(screen.getByText(/Este texto se registró antes de que existieran/)).toBeInTheDocument()
    expect(screen.getByText(/Esta sección aún no tiene versión en inglés/)).toBeInTheDocument()
    expect(tab(/^English · Sin traducción$/)).toBeInTheDocument()
  })

  test('opens with an empty English tab instead of copying the base text', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...legacyArgs} />)

    await user.click(tab(/^English/))

    expect(field('Título (English)')).toHaveValue('')
    expect(field('Texto (English)')).toHaveValue('')
  })

  test('does not label the base text as Spanish', () => {
    renderWithIntl(<LasceSectionForm {...legacyArgs} />)

    expect(field('Título (Español)')).toHaveAttribute('lang', '')
    const english = screen.getByRole('textbox', { name: /^Título \(English\)/, hidden: true })
    expect(english).toHaveAttribute('lang', 'en')
  })

  test('requires both languages once the text changes', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<LasceSectionForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'Texto (Español)', 'Texto en español.')
    await save(user)

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('El título en inglés es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El texto en inglés es obligatorio.')).toBeInTheDocument()
  })
})

describe('LasceSectionForm: discarding changes', () => {
  test('calls onCancel directly, without asking, when nothing was typed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: discardTitle })).not.toBeInTheDocument()
  })

  test('asks before discarding what was typed, and keeps it on "Seguir editando"', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onCancel={onCancel} />)

    await replace(user, 'Título (Español)', 'Otro título')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: discardTitle })
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(field('Título (Español)')).toHaveValue('Otro título')
  })

  test('closes the form once the changes are discarded', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<LasceSectionForm {...editArgs} onCancel={onCancel} />)

    await replace(user, 'Título (Español)', 'Otro título')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: discardTitle })
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('asks the same when the modal around it is closed through requestCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const handle = createRef<LasceSectionFormHandle>()
    renderWithIntl(<LasceSectionForm {...editArgs} onCancel={onCancel} ref={handle} />)

    act(() => handle.current?.requestCancel())
    expect(onCancel).toHaveBeenCalledTimes(1)

    await replace(user, 'Título (Español)', 'Otro título')
    act(() => handle.current?.requestCancel())

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: discardTitle })).toBeInTheDocument()
  })
})

describe('LasceSectionForm: errors from the server', () => {
  test('shows each error under its field and opens the tab that holds one', () => {
    renderWithIntl(<LasceSectionForm {...serverErrorArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Texto (Español)')).toHaveAccessibleDescription(
      'El texto en español no puede superar 5000 caracteres.',
    )
  })

  test('clears a server error once its field changes', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...serverErrorArgs} />)

    await replace(user, 'Texto (Español)', 'Texto corto.')

    expect(
      screen.queryByText('El texto en español no puede superar 5000 caracteres.'),
    ).not.toBeInTheDocument()
  })
})

describe('LasceSectionForm: in English, the language the site is shown in', () => {
  test('labels every field and action in English, naming each language by its own name', () => {
    renderWithIntl(<LasceSectionForm {...editArgs} />, { locale: 'en' })

    expect(field('Title (Español)')).toBeInTheDocument()
    expect(field('Text (Español)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getAllByText('Separate paragraphs with a blank line.')).toHaveLength(2)
  })

  test('explains a missing field in English', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LasceSectionForm {...editArgs} />, { locale: 'en' })

    await replace(user, 'Title (Español)', '')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByText('The Spanish title is required.')).toBeInTheDocument()
  })
})
