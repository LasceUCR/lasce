import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { PublicationForm, type PublicationFormProps } from './PublicationForm'
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
  await user.click(screen.getByRole('button', { name: 'Añadir autor' }))
  const dialog = screen.getByRole('dialog', { name: 'Añadir autor' })
  await user.type(within(dialog).getByRole('textbox', { name: 'Nombre del autor' }), name)
  await user.click(within(dialog).getByRole('button', { name: 'Añadir' }))
}

async function confirmSave(user: User, title = 'Guardar cambios') {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  const dialog = screen.getByRole('dialog', { name: title })
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
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
    render(<PublicationForm {...editArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (Español)')).toHaveValue('Actividad solar y clima espacial')
    expect(screen.queryByRole('textbox', { name: 'Título (English)' })).not.toBeInTheDocument()
  })

  test('shows the English text on the English tab', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...editArgs} />)

    await user.click(tab(/^English/))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveValue('Solar Activity and Space Weather')
  })

  test('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...editArgs} />)

    tab(/^Español/).focus()
    await user.keyboard('{ArrowRight}')

    expect(tab(/^English/)).toHaveFocus()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
  })

  test('keeps what was typed when switching tabs', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...editArgs} />)

    await replace(user, 'Título (Español)', 'Otro título')
    await user.click(tab(/^English/))
    await user.click(tab(/^Español/))

    expect(field('Título (Español)')).toHaveValue('Otro título')
  })

  test('keeps the shared fields outside the tabs', () => {
    render(<PublicationForm {...editArgs} />)

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
    render(<PublicationForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('PublicationForm: creating', () => {
  test('requires the title and abstract in both languages', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...createArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('El título en español es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('El resumen en español es obligatorio.')).toBeInTheDocument()
    expect(tab(/^English · 2 por revisar$/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('rejects text made only of spaces, tabs or line breaks', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...createArgs} />)

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
    render(<PublicationForm {...createArgs} />)

    await user.type(field('Título (Español)'), 'Título')
    await user.type(field('Resumen (Español)'), 'Resumen')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveFocus()
    expect(screen.getByText('El título en inglés es obligatorio.')).toBeInTheDocument()
  })

  test('says which other tab still has problems', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...createArgs} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Revise también la pestaña English.')
  })

  test('saves a new publication in both languages without a DOI or link', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...createArgs} onSave={onSave} />)

    await fillNewPublication(user)
    await confirmSave(user, 'Agregar publicación')

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
    render(<PublicationForm {...createArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'ROSAC')
    await user.type(field('Resumen (Español)'), 'Radio Observatorio de Santa Cruz.')
    await user.click(tab(/^English/))
    await user.type(field('Título (English)'), 'ROSAC')
    await user.type(field('Resumen (English)'), 'Radio Observatorio de Santa Cruz.')
    await addAuthor(user, 'LASCE')
    await user.type(field('Revista/Publicación'), 'Nota institucional')
    await confirmSave(user, 'Agregar publicación')

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  test('rejects a DOI written as a link and an external link without http', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...createArgs} onSave={onSave} />)

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
    render(<PublicationForm {...createArgs} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByText('Debe existir al menos un autor.')).toBeInTheDocument()
    expect(field('Revista/Publicación')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('PublicationForm: bilingual review when editing', () => {
  test('asks to update or confirm the English title when only the Spanish one changed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Actividad solar reciente')

    expect(tab(/^English · 1 por revisar$/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByText(
        'Cambió el título en español. Actualice el título en inglés o confirme que sigue siendo correcto.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves once the English title is explicitly confirmed', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Actividad solar reciente')
    await user.click(tab(/^English/))
    await user.click(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    )
    await confirmSave(user)

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
    render(<PublicationForm {...editArgs} />)

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
    render(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Título nuevo')
    await user.click(tab(/^English/))
    await replace(user, 'Título (English)', 'New title')

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()

    await confirmSave(user)

    expect(onSave).toHaveBeenCalledWith(expect.anything(), [])
  })

  test('drops a confirmation as soon as either language of that field changes again', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...editArgs} />)

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
    render(<PublicationForm {...legacyArgs} />)

    expect(tab(/^English · Sin traducción$/)).toBeInTheDocument()
    expect(screen.getByText(/podría no\s+estar en español/)).toBeInTheDocument()
  })

  test('opens with an empty English tab instead of copying the base text', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...legacyArgs} />)

    await user.click(tab(/^English/))

    expect(field('Título (English)')).toHaveValue('')
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
  })

  test('saves a shared-field change without asking for a translation', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'DOI', '10.5555/fixed')
    await confirmSave(user)

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ DOI: '10.5555/fixed' }), [])
  })

  test('requires both languages once a title or abstract changes', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Electrones no térmicos en una fulguración eruptiva')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    // The base abstract must be reviewed too: it may not be Spanish at all.
    expect(
      screen.getByRole('switch', { name: 'El resumen en español sigue siendo correcto' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Al agregar la versión en inglés, revise el resumen en español: el texto original podría estar en otro idioma. Actualícelo o confirme que es correcto.',
      ),
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
    render(<PublicationForm {...serverErrorArgs} />)

    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (English)')).toHaveAccessibleDescription(
      'El título en inglés es obligatorio.',
    )
    expect(field('DOI')).toHaveAccessibleDescription('Ya existe una publicación con este DOI.')
  })

  test('clears a server error once its field changes', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...serverErrorArgs} />)

    await replace(user, 'DOI', '10.5555/other')

    expect(screen.queryByText('Ya existe una publicación con este DOI.')).not.toBeInTheDocument()
  })
})

describe('PublicationForm: authors', () => {
  test('adds an author', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...editArgs} />)

    await addAuthor(user, 'Luis Vargas')

    expect(screen.getByRole('button', { name: 'Eliminar Luis Vargas' })).toBeInTheDocument()
  })

  test('refuses an author already in the list', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...editArgs} />)

    await addAuthor(user, 'juan pérez')

    expect(screen.getByRole('alert')).toHaveTextContent('Ese autor ya fue agregado.')
  })

  test('removes an author', async () => {
    const user = userEvent.setup()
    render(<PublicationForm {...editArgs} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar María Rodríguez' }))

    expect(
      screen.queryByRole('button', { name: 'Eliminar María Rodríguez' }),
    ).not.toBeInTheDocument()
  })

  test('does not save when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<PublicationForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Revista/Publicación', 'Solar Physics')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Guardar cambios' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
    render(<PublicationForm {...editArgs} />)

    const fields = contentFields()
    expect(fields['Título (Español)']).toHaveAttribute('lang', 'es')
    expect(fields['Resumen (Español)']).toHaveAttribute('lang', 'es')
    expect(fields['Título (English)']).toHaveAttribute('lang', 'en')
    expect(fields['Resumen (English)']).toHaveAttribute('lang', 'en')
  })

  test('marks the fields of a new publication with their language', () => {
    render(<PublicationForm {...createArgs} />)

    const fields = contentFields()
    expect(fields['Título (Español)']).toHaveAttribute('lang', 'es')
    expect(fields['Título (English)']).toHaveAttribute('lang', 'en')
  })

  test('does not label the base text of a legacy record as Spanish', () => {
    render(<PublicationForm {...legacyArgs} />)

    const fields = contentFields()
    expect(fields['Título (Español)']).toHaveAttribute('lang', '')
    expect(fields['Resumen (Español)']).toHaveAttribute('lang', '')
    expect(fields['Título (English)']).toHaveAttribute('lang', 'en')
    expect(fields['Resumen (English)']).toHaveAttribute('lang', 'en')
  })

  test('leaves the editor copy and the shared fields in the surrounding language', () => {
    render(<PublicationForm {...editArgs} />)

    for (const panel of screen.getAllByRole('tabpanel', { hidden: true })) {
      expect(panel).not.toHaveAttribute('lang')
    }
    expect(screen.getByText('Título (English)').closest('[lang]')).toBeNull()
    expect(field('Revista/Publicación')).not.toHaveAttribute('lang')
    expect(field('DOI')).not.toHaveAttribute('lang')
  })

  test('keeps the tabs named in their own language', () => {
    render(<PublicationForm {...editArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('lang', 'es')
    expect(tab(/^English/)).toHaveAttribute('lang', 'en')
  })
})
