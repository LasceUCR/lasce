import { act, screen, within } from '@testing-library/react'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, test, vi } from 'vitest'

import {
  PublicationForm,
  type PublicationFormHandle,
  type PublicationFormProps,
} from './PublicationForm'
import { Modal } from '@/app/components/public/Modal'
import { Create, Default, Legacy, ServerErrors } from './PublicationForm.stories'

const editArgs = Default.args as PublicationFormProps
const createArgs = Create.args as PublicationFormProps
const legacyArgs = Legacy.args as PublicationFormProps
const serverErrorArgs = ServerErrors.args as PublicationFormProps

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

async function addAuthor(user: User, name: string) {
  await user.type(screen.getByRole('textbox', { name: 'Nombre del autor' }), name)
  await user.click(screen.getByRole('button', { name: 'Agregar' }))
}

/** Saving asks for no confirmation: "Confirmar" saves straight away once the form is valid. */
async function save(user: User) {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
}

async function fillNewPublication(user: User) {
  await user.type(field('Título (Español)'), 'Título nuevo')
  await user.type(field('Resumen (Español)'), 'Resumen nuevo')
  await user.click(tab(/^English/))
  await user.type(field('Título (English)'), 'New title')
  await user.type(field('Resumen (English)'), 'New abstract')
  await addAuthor(user, 'Ana Mora')
  await user.type(field('Revista/Publicación'), 'Solar Physics')
}

describe('PublicationForm: tabs and pre-filled values', () => {
  test('opens on the Spanish tab with the stored Spanish text', () => {
    renderWithIntl(<PublicationForm {...editArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (Español)')).toHaveValue('Actividad solar y clima espacial')
    expect(screen.queryByRole('textbox', { name: 'Título (English)' })).not.toBeInTheDocument()
  })

  test('shows the English text on the English tab', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    await user.click(tab(/^English/))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveValue('Solar Activity and Space Weather')
  })

  test('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    tab(/^Español/).focus()
    await user.keyboard('{ArrowRight}')

    expect(tab(/^English/)).toHaveFocus()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
  })

  test('keeps what was typed when switching tabs', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    await replace(user, 'Título (Español)', 'Otro título')
    await user.click(tab(/^English/))
    await user.click(tab(/^Español/))

    expect(field('Título (Español)')).toHaveValue('Otro título')
  })

  test('keeps the shared fields outside the tabs', () => {
    renderWithIntl(<PublicationForm {...editArgs} />)

    const panel = screen.getByRole('tabpanel')
    expect(within(panel).queryByRole('textbox', { name: 'DOI' })).not.toBeInTheDocument()
    expect(field('DOI')).toHaveValue('10.1109/CONCAPAN63470.2024.10933895')
    expect(field('Revista/Publicación')).toHaveValue('Astrophysical Journal')
    expect(screen.getByRole('combobox', { name: 'Grupo' })).toHaveValue('LASCE')
    expect(screen.getByRole('group', { name: 'Autores' })).toBeInTheDocument()
  })

  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<PublicationForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('saves without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Revista/Publicación', 'Solar Physics')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('PublicationForm: in a modal', () => {
  test('puts the language tabs beside the modal title', () => {
    renderWithIntl(
      <Modal onClose={() => {}} open title="Editar publicación">
        <PublicationForm {...editArgs} />
      </Modal>,
    )

    const header = screen.getByRole('heading', { name: 'Editar publicación' }).parentElement
    expect(header).toContainElement(screen.getByRole('tablist'))
    expect(screen.getByRole('tabpanel', { name: 'Español' })).toBeVisible()
  })

  test('keeps the tabs above the fields outside a modal', () => {
    renderWithIntl(<PublicationForm {...editArgs} />)

    const tablist = screen.getByRole('tablist')
    const panel = screen.getByRole('tabpanel', { name: 'Español' })
    expect(tablist.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(tablist.parentElement).toBe(panel.parentElement)
  })
})

describe('PublicationForm: discarding changes', () => {
  const discardTitle = 'Descartar cambios no guardados'

  test('asks before discarding what was typed, and keeps it on "Seguir editando"', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<PublicationForm {...createArgs} onCancel={onCancel} />)

    await user.type(field('Título (Español)'), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    const dialog = screen.getByRole('dialog', { name: discardTitle })
    expect(dialog).toHaveTextContent(
      'Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: discardTitle })).not.toBeInTheDocument()
    expect(field('Título (Español)')).toHaveValue('Borrador')
  })

  test('closes the form once the changes are discarded', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<PublicationForm {...editArgs} onCancel={onCancel} />)

    await addAuthor(user, 'Luis Pérez')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialog = screen.getByRole('dialog', { name: discardTitle })
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('asks the same when the modal around it is closed through requestCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const handle = createRef<PublicationFormHandle>()
    renderWithIntl(<PublicationForm {...editArgs} onCancel={onCancel} ref={handle} />)

    act(() => handle.current?.requestCancel())
    expect(onCancel).toHaveBeenCalledTimes(1)

    await replace(user, 'DOI', '')
    act(() => handle.current?.requestCancel())

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: discardTitle })).toBeInTheDocument()
  })
})

describe('PublicationForm: creating', () => {
  test('requires the title and abstract in both languages', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...createArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El resumen en español es obligatorio.')).toBeInTheDocument()
    expect(tab(/^English · 2 por revisar$/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('rejects text made only of spaces, tabs or line breaks', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...createArgs} />)

    await user.type(field('Título (Español)'), '   ')
    await user.type(field('Resumen (Español)'), '\t{Enter}')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(field('Título (Español)')).toHaveAccessibleDescription(
      'El título en español es obligatorio.',
    )
    expect(field('Resumen (Español)')).toHaveAttribute('aria-invalid', 'true')
  })

  test('opens the hidden tab that has errors and focuses its first invalid field', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...createArgs} />)

    await user.type(field('Título (Español)'), 'Título')
    await user.type(field('Resumen (Español)'), 'Resumen')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveFocus()
    expect(screen.getByText('El título en inglés es obligatorio.')).toBeInTheDocument()
  })

  test('flags the other tab without an additional error summary', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...createArgs} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(tab(/^English/)).toHaveTextContent('2 por revisar')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('saves a new publication in both languages without a DOI or link', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...createArgs} onSave={onSave} />)

    await fillNewPublication(user)
    await save(user)

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        content: {
          es: { title: 'Título nuevo', abstract: 'Resumen nuevo' },
          en: { title: 'New title', abstract: 'New abstract' },
        },
        authors: ['Ana Mora'],
        venue: 'Solar Physics',
        href: '',
        DOI: '',
      }),
      [],
    )
  })

  test('accepts the same text in both languages', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...createArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'ROSAC')
    await user.type(field('Resumen (Español)'), 'Radio Observatorio de Santa Cruz.')
    await user.click(tab(/^English/))
    await user.type(field('Título (English)'), 'ROSAC')
    await user.type(field('Resumen (English)'), 'Radio Observatorio de Santa Cruz.')
    await addAuthor(user, 'LASCE')
    await user.type(field('Revista/Publicación'), 'Nota institucional')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  test('rejects a DOI written as a link and an external link without http', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...createArgs} onSave={onSave} />)

    await fillNewPublication(user)
    await user.type(field('DOI'), 'https://doi.org/10.1/x')
    await user.type(field('Enlace externo'), 'example.com')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(field('DOI')).toHaveAccessibleDescription(
      'El DOI debe tener la forma 10.<registrante>/<sufijo>, sin prefijos.',
    )
    expect(field('Enlace externo')).toHaveAttribute('aria-invalid', 'true')
    expect(onSave).not.toHaveBeenCalled()
  })

  test('requires at least one author and a venue', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...createArgs} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('Debe existir al menos un autor.')).toBeInTheDocument()
    expect(field('Revista/Publicación')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('PublicationForm: bilingual review when editing', () => {
  test('asks to update or confirm the English title when only the Spanish one changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Actividad solar reciente')

    expect(tab(/^English · 1 por revisar$/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByText('Actualice este campo o confirme que sigue siendo correcto.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves once the English title is explicitly confirmed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Actividad solar reciente')
    await user.click(tab(/^English/))
    await user.click(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    )
    await save(user)

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          es: expect.objectContaining({ title: 'Actividad solar reciente' }),
        }),
      }),
      [{ locale: 'en', field: 'title' }],
    )
  })

  test('applies the same rule from English to Spanish', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    await user.click(tab(/^English/))
    await replace(user, 'Resumen (English)', 'A better abstract.')
    await user.click(tab(/^Español/))

    expect(
      screen.getByRole('switch', { name: 'El resumen en español sigue siendo correcto' }),
    ).toHaveAttribute('aria-checked', 'false')
  })

  test('needs no confirmation when both languages changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Título nuevo')
    await user.click(tab(/^English/))
    await replace(user, 'Título (English)', 'New title')

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()

    await save(user)

    expect(onSave).toHaveBeenCalledWith(expect.anything(), [])
  })

  test('drops a confirmation as soon as either language of that field changes again', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    await replace(user, 'Título (Español)', 'Actividad solar reciente')
    await user.click(tab(/^English/))
    const toggle = screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.click(tab(/^Español/))
    await user.type(field('Título (Español)'), ' 2026')
    await user.click(tab(/^English/))

    expect(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    ).toHaveAttribute('aria-checked', 'false')
  })
})

describe('PublicationForm: legacy records', () => {
  test('flags the missing English version and the unknown language of the base text', () => {
    renderWithIntl(<PublicationForm {...legacyArgs} />)

    expect(tab(/^English · Sin traducción$/)).toBeInTheDocument()
    expect(screen.getByText(/podría no\s+estar en español/)).toBeInTheDocument()
  })

  test('opens with an empty English tab instead of copying the base text', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...legacyArgs} />)

    await user.click(tab(/^English/))

    expect(field('Título (English)')).toHaveValue('')
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
  })

  test('saves a shared-field change without asking for a translation', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'DOI', '10.5555/fixed')
    await save(user)

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ DOI: '10.5555/fixed' }), [])
  })

  test('requires both languages once a title or abstract changes', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Electrones no térmicos en una fulguración eruptiva')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    // The base abstract must be reviewed too: it may not be Spanish at all.
    expect(
      screen.getByRole('switch', { name: 'El resumen en español sigue siendo correcto' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Actualice este campo o confirme que sigue siendo correcto.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Cambió el resumen en inglés/)).not.toBeInTheDocument()
    expect(tab(/^English · 2 por revisar$/)).toBeInTheDocument()

    await user.click(tab(/^English/))
    expect(screen.getByText('El título en inglés es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El resumen en inglés es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('PublicationForm: errors from the server', () => {
  test('shows each error under its field and opens the tab that holds one', () => {
    renderWithIntl(<PublicationForm {...serverErrorArgs} />)

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveAccessibleDescription(
      'El título en inglés es obligatorio.',
    )
    expect(field('DOI')).toHaveAccessibleDescription('Ya existe una publicación con este DOI.')
  })

  test('clears a server error once its field changes', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...serverErrorArgs} />)

    await replace(user, 'DOI', '10.5555/other')

    expect(screen.queryByText('Ya existe una publicación con este DOI.')).not.toBeInTheDocument()
  })
})

describe('PublicationForm: authors', () => {
  test('adds an author', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    await addAuthor(user, 'Luis Vargas')

    // A fourth author waits behind "+1 más" until the list is expanded.
    expect(screen.getByText('4 autores')).toBeInTheDocument()
    expect(screen.getByText('+1 más')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ver todos los autores/ }))
    expect(screen.getByRole('button', { name: 'Eliminar Luis Vargas' })).toBeInTheDocument()
  })

  test('refuses an author already in the list', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    await addAuthor(user, 'juan pérez')

    expect(screen.getByRole('alert')).toHaveTextContent('Ese autor ya fue agregado.')
  })

  test('removes an author', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicationForm {...editArgs} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar María Rodríguez' }))

    expect(
      screen.queryByRole('button', { name: 'Eliminar María Rodríguez' }),
    ).not.toBeInTheDocument()
  })

  test('marks the authors as required', () => {
    renderWithIntl(<PublicationForm {...createArgs} />)

    const label = screen.getByText('Autores', { selector: '.cms-form-field-label' })
    expect(label).toHaveTextContent('Autores *')
  })

  test('focuses the author box when saving without authors', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<PublicationForm {...createArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'Título')
    await user.type(field('Resumen (Español)'), 'Resumen')
    await user.click(tab(/^English/))
    await user.type(field('Título (English)'), 'Title')
    await user.type(field('Resumen (English)'), 'Abstract')
    await user.type(field('Revista/Publicación'), 'Solar Physics')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByRole('textbox', { name: 'Nombre del autor' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Nombre del autor' })).toHaveAccessibleDescription(
      'Debe existir al menos un autor.',
    )
    expect(field('DOI')).toHaveValue('')
    expect(field('DOI')).not.toHaveAttribute('aria-invalid', 'true')
    expect(field('DOI')).not.toHaveAttribute('aria-describedby')
    expect(onSave).not.toHaveBeenCalled()
  })

  test('lays the metadata out in a row of three and a row of two, before the authors', () => {
    const { container } = renderWithIntl(<PublicationForm {...editArgs} />)

    const rows = Array.from(container.querySelectorAll('.cms-form-grid')).map((row) =>
      Array.from(row.querySelectorAll('.cms-form-field-label')).map((label) =>
        label.textContent?.replace(' *', ''),
      ),
    )
    expect(rows).toEqual([
      ['Fecha de publicación', 'DOI', 'Grupo'],
      ['Enlace externo', 'Revista/Publicación'],
    ])
    expect(container.querySelector('.cms-form-grid-2 + .publication-authors')).not.toBeNull()
  })
})

describe('PublicationForm: content language', () => {
  /** Every title and abstract field, including those on the hidden tab. */
  function contentFields() {
    return Object.fromEntries(
      ['Título (Español)', 'Resumen (Español)', 'Título (English)', 'Resumen (English)'].map(
        (label) => [
          label,
          screen.getByRole('textbox', {
            name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`),
            hidden: true,
          }),
        ],
      ),
    )
  }

  test('marks each language field with its language, on both tabs', () => {
    renderWithIntl(<PublicationForm {...editArgs} />)

    const fields = contentFields()
    expect(fields['Título (Español)']).toHaveAttribute('lang', 'es')
    expect(fields['Resumen (Español)']).toHaveAttribute('lang', 'es')
    expect(fields['Título (English)']).toHaveAttribute('lang', 'en')
    expect(fields['Resumen (English)']).toHaveAttribute('lang', 'en')
  })

  test('marks the fields of a new publication with their language', () => {
    renderWithIntl(<PublicationForm {...createArgs} />)

    const fields = contentFields()
    expect(fields['Título (Español)']).toHaveAttribute('lang', 'es')
    expect(fields['Título (English)']).toHaveAttribute('lang', 'en')
  })

  test('does not label the base text of a legacy record as Spanish', () => {
    renderWithIntl(<PublicationForm {...legacyArgs} />)

    const fields = contentFields()
    expect(fields['Título (Español)']).toHaveAttribute('lang', '')
    expect(fields['Resumen (Español)']).toHaveAttribute('lang', '')
    expect(fields['Título (English)']).toHaveAttribute('lang', 'en')
    expect(fields['Resumen (English)']).toHaveAttribute('lang', 'en')
  })

  test('leaves the editor copy and the shared fields in the surrounding language', () => {
    renderWithIntl(<PublicationForm {...editArgs} />)

    for (const panel of screen.getAllByRole('tabpanel', { hidden: true })) {
      expect(panel).not.toHaveAttribute('lang')
    }
    expect(screen.getByText('Título (English)').closest('[lang]')).toBeNull()
    expect(field('Revista/Publicación')).not.toHaveAttribute('lang')
    expect(field('DOI')).not.toHaveAttribute('lang')
  })

  test('keeps the tabs named in their own language', () => {
    renderWithIntl(<PublicationForm {...editArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('lang', 'es')
    expect(tab(/^English/)).toHaveAttribute('lang', 'en')
  })
})

describe('PublicationForm: in English, the language the site is shown in', () => {
  function renderInEnglish(props: PublicationFormProps) {
    return renderWithIntl(<PublicationForm {...props} />, { locale: 'en' })
  }

  test('labels every field and action in English, naming each language by its own name', () => {
    renderInEnglish(createArgs)

    expect(screen.getByRole('tablist', { name: 'Content language' })).toBeInTheDocument()
    expect(field('Title (Español)')).toBeInTheDocument()
    expect(field('Abstract (Español)')).toBeInTheDocument()
    expect(field('External link')).toBeInTheDocument()
    expect(field('DOI')).toHaveAttribute('placeholder', '10.1234/example')
    expect(field('Journal/Publication')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Publication date/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Authors' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Group' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  test('explains the missing fields in English and flags the other tab', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderInEnglish({ ...createArgs, onSave })

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByText('The Spanish title is required.')).toBeInTheDocument()
    expect(screen.getByText('There must be at least one author.')).toBeInTheDocument()
    expect(screen.getByText('The journal or publication is required.')).toBeInTheDocument()
    expect(tab(/^English · 2 to review$/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('marks the tab notes as English, the editor language, not the tab language', async () => {
    const user = userEvent.setup()
    renderInEnglish(createArgs)

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(within(tab(/^Español/)).getByText('2 to review')).toHaveAttribute('lang', 'en')
    expect(tab(/^Español/)).toHaveAttribute('lang', 'es')
  })

  test('asks for the review of the other language in English', async () => {
    const user = userEvent.setup()
    renderInEnglish(editArgs)

    await replace(user, 'Title (Español)', 'Nuevo título')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await user.click(tab(/^English/))

    expect(
      screen.getByText('Update this field or confirm that it is still correct.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'The English title is still correct' }),
    ).toBeInTheDocument()
  })

  test('explains a legacy record in English', async () => {
    const user = userEvent.setup()
    renderInEnglish(legacyArgs)

    expect(screen.getByText(/may not be in Spanish/)).toBeInTheDocument()
    expect(tab(/^English · No translation$/)).toBeInTheDocument()
    await user.click(tab(/^English/))
    expect(screen.getByText(/has no English version yet/)).toBeInTheDocument()
  })

  test('adds an author and asks before discarding, in English', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderInEnglish({ ...createArgs, onCancel })

    await user.type(screen.getByRole('textbox', { name: 'Author name' }), 'Ana{Enter}')
    expect(screen.getByRole('button', { name: 'Remove Ana' })).toBeInTheDocument()
    expect(screen.getByText('1 author')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Author name' }), 'ana')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toHaveTextContent('That author has already been added.')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    const discard = screen.getByRole('dialog', { name: 'Discard unsaved changes' })
    expect(discard).toHaveTextContent(
      'If you discard now, all the data entered that has not been saved will be lost.',
    )
    await user.click(within(discard).getByRole('button', { name: 'Discard' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
