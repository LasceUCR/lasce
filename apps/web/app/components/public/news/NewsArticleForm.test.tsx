import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { buildCreateRequest, buildUpdateRequest } from '@/app/lib/news-form'

import {
  NewsArticleForm,
  type NewsArticleFormHandle,
  type NewsArticleFormProps,
} from './NewsArticleForm'
import { AddNew, EditExisting, EnglishInterface, Legacy, Saving } from './NewsArticleForm.stories'
import { editableArticle } from './fixtures'

const editArgs = EditExisting.args as NewsArticleFormProps
const addArgs = AddNew.args as NewsArticleFormProps
const legacyArgs = Legacy.args as NewsArticleFormProps

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

async function save(user: User) {
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
}

describe('NewsArticleForm: tabs and pre-filled values', () => {
  test('opens on the Spanish tab with the stored Spanish text and the shared fields', () => {
    renderWithIntl(<NewsArticleForm {...editArgs} />)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Título (Español)')).toHaveValue(editableArticle.editing!.content.es.title)
    expect(field('Resumen (Español)')).toHaveValue(editableArticle.editing!.content.es.abstract)
    expect(field('Autores')).toHaveValue(editableArticle.authors)
    expect(field('Fuente')).toHaveValue(editableArticle.source)
    expect(field('Enlace')).toHaveValue(editableArticle.href)
  })

  test('shows the English translation on the English tab', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsArticleForm {...editArgs} />)

    await user.click(tab(/^English/))

    expect(field('Título (English)')).toHaveValue(editableArticle.editing!.content.en!.title)
    expect(field('Título (English)')).toHaveAttribute('lang', 'en')
  })

  test('keeps the shared fields outside the tabs', () => {
    renderWithIntl(<NewsArticleForm {...editArgs} />)

    const panel = screen.getByRole('tabpanel')
    expect(within(panel).queryByRole('textbox', { name: /^Fuente/ })).not.toBeInTheDocument()
    expect(field('Fuente')).toBeInTheDocument()
  })

  test('asks for no image, since news cards do not show one', () => {
    renderWithIntl(<NewsArticleForm {...editArgs} />)

    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  test('follows the site language for its own labels', () => {
    renderWithIntl(<NewsArticleForm {...(EnglishInterface.args as NewsArticleFormProps)} />, {
      locale: 'en',
    })

    expect(field('Title (Español)')).toBeInTheDocument()
    expect(field('Source')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  test('disables its fields and says it is saving while a save is in flight', () => {
    renderWithIntl(<NewsArticleForm {...(Saving.args as NewsArticleFormProps)} />)

    expect(field('Título (Español)')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
  })
})

describe('NewsArticleForm: saving', () => {
  test('saves a shared-field change as is, without asking about translations', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Fuente', 'Delfino.cr')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    const [draft, confirmed] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(editArgs.initial, draft, confirmed)).toEqual({
      version: editArgs.initial.version,
      source: 'Delfino.cr',
    })
  })

  test('splits a comma-separated author list', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Autores', 'Ana Pérez, Beto Ruiz')
    await save(user)

    const [draft, confirmed] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(editArgs.initial, draft, confirmed)).toMatchObject({
      authors: ['Ana Pérez', 'Beto Ruiz'],
    })
  })

  test('asks to update or confirm the other language when a title changes in one only', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Título (Español)', 'Un título nuevo')
    await save(user)

    expect(onSave).not.toHaveBeenCalled()
    expect(tab(/^English/)).toHaveAttribute('aria-selected', 'true')

    await user.click(
      screen.getByRole('switch', { name: 'El título en inglés sigue siendo correcto' }),
    )
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    const [draft, confirmed] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(editArgs.initial, draft, confirmed)).toMatchObject({
      content: {
        es: { title: 'Un título nuevo' },
        en: { title: editableArticle.editing!.content.en!.title },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })

  test('saves a new item once both languages and the shared fields are filled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NewsArticleForm {...addArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'Un título')
    await user.type(field('Resumen (Español)'), 'Un resumen.')
    await user.click(tab(/^English/))
    await user.type(field('Título (English)'), 'A title')
    await user.type(field('Resumen (English)'), 'An abstract.')
    await user.type(field('Autores'), 'Ana Pérez')
    await user.type(field('Fuente'), 'La Nación')
    await user.type(field('Enlace'), 'https://example.com/nota')
    await save(user)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(buildCreateRequest(onSave.mock.calls[0]![0])).toEqual({
      content: {
        es: { title: 'Un título', abstract: 'Un resumen.' },
        en: { title: 'A title', abstract: 'An abstract.' },
      },
      authors: ['Ana Pérez'],
      source: 'La Nación',
      publishedAt: null,
      externalUrl: 'https://example.com/nota',
    })
  })

  test('explains what is missing instead of saving a new item', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NewsArticleForm {...addArgs} onSave={onSave} />)

    await user.type(field('Título (Español)'), 'Un título')
    await save(user)

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Debe indicar al menos un autor.')).toBeInTheDocument()
    expect(screen.getByText('La fuente es obligatoria.')).toBeInTheDocument()
    expect(field('Resumen (Español)')).toHaveAttribute('aria-invalid', 'true')
    expect(tab(/^English/)).toHaveAccessibleName(/por revisar/)
  })

  test('rejects a link that is not a web address', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await replace(user, 'Enlace', 'javascript:alert(1)')
    await save(user)

    expect(onSave).not.toHaveBeenCalled()
    expect(
      screen.getByText('El enlace debe ser una URL que empiece con http:// o https://.'),
    ).toBeInTheDocument()
  })
})

describe('NewsArticleForm: legacy items', () => {
  test('flags the base text and the missing English version', async () => {
    const user = userEvent.setup()
    renderWithIntl(<NewsArticleForm {...legacyArgs} />)

    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
    expect(field('Título (Español)')).toHaveAttribute('lang', '')
    expect(tab(/^English · Sin traducción$/)).toBeInTheDocument()

    await user.click(tab(/^English/))
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
    expect(field('Título (English)')).toHaveValue('')
  })

  test('saves a shared-field change without translating the item', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithIntl(<NewsArticleForm {...legacyArgs} onSave={onSave} />)

    await replace(user, 'Fuente', 'UCR')
    await save(user)

    const [draft, confirmed] = onSave.mock.calls[0]!
    expect(buildUpdateRequest(legacyArgs.initial, draft, confirmed)).toEqual({
      version: legacyArgs.initial.version,
      source: 'UCR',
    })
  })
})

describe('NewsArticleForm: closing', () => {
  test('closes straight away when nothing changed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<NewsArticleForm {...editArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('asks before discarding changes, and discards once confirmed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<NewsArticleForm {...addArgs} onCancel={onCancel} />)

    await user.type(field('Título (Español)'), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('keeps editing when the discard question is dismissed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithIntl(<NewsArticleForm {...addArgs} onCancel={onCancel} />)

    await user.type(field('Título (Español)'), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(field('Título (Español)')).toHaveValue('Borrador')
  })

  test('asks the same question when its parent requests closing', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const ref = createRef<NewsArticleFormHandle>()
    renderWithIntl(<NewsArticleForm {...addArgs} onCancel={onCancel} ref={ref} />)

    await user.type(field('Título (Español)'), 'Borrador')
    act(() => ref.current!.requestCancel())

    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
