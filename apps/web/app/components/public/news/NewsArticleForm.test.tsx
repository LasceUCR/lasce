import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { NewsArticleForm, type NewsArticleFormProps } from './NewsArticleForm'
import { AddNew, EditExisting } from './NewsArticleForm.stories'

const editArgs = EditExisting.args as NewsArticleFormProps
const addArgs = AddNew.args as NewsArticleFormProps

describe('NewsArticleForm', () => {
  test('pre-fills every field from the article it is given', () => {
    render(<NewsArticleForm {...editArgs} />)

    const article = editArgs.article!
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(article.title)
    expect(screen.getByRole('textbox', { name: 'Autores' })).toHaveValue(article.authors)
    expect(screen.getByRole('textbox', { name: 'Fuente' })).toHaveValue(article.source)
    expect(screen.getByRole('textbox', { name: 'Enlace' })).toHaveValue(article.href)
    expect(screen.getByRole('textbox', { name: 'Resumen' })).toHaveValue(article.abstract)
  })

  test('asks for no image, since news cards no longer show one', () => {
    render(<NewsArticleForm {...editArgs} />)

    expect(screen.queryByText('Imagen')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Texto alternativo/ })).not.toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  test('saves exactly the edited fields', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Nuevo título')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const article = editArgs.article!
    expect(onSave).toHaveBeenCalledWith({
      title: 'Nuevo título',
      authors: [article.authors],
      source: article.source,
      publishedAt: article.publishedAt,
      externalUrl: article.href,
      abstract: article.abstract,
    })
  })

  test('splits a comma-separated author list into an array', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Autores' }))
    await user.type(screen.getByRole('textbox', { name: 'Autores' }), 'Ana Pérez, Beto Ruiz')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ authors: ['Ana Pérez', 'Beto Ruiz'] }),
    )
  })

  test('calls onCancel without saving', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onSave = vi.fn()
    render(<NewsArticleForm {...editArgs} onCancel={onCancel} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  test('starts blank for a new article and explains the missing fields instead of saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...addArgs} onSave={onSave} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('')

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Un título')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    // A title alone is not enough.
    expect(screen.getByText('Debe indicar al menos un autor.')).toBeInTheDocument()
    expect(screen.getByText('La fuente es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('El resumen es obligatorio.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  test('saves a new article once the required text fields are filled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...addArgs} onSave={onSave} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Un título')
    await user.type(screen.getByRole('textbox', { name: 'Autores' }), 'Ana Pérez')
    await user.type(screen.getByRole('textbox', { name: 'Fuente' }), 'La Nación')
    await user.type(screen.getByRole('textbox', { name: 'Enlace' }), 'https://example.com/nota')
    await user.type(screen.getByRole('textbox', { name: 'Resumen' }), 'Un resumen.')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Un título',
      authors: ['Ana Pérez'],
      source: 'La Nación',
      publishedAt: null,
      externalUrl: 'https://example.com/nota',
      abstract: 'Un resumen.',
    })
  })

  test('prompts discard confirmation when clicking Cancel with modifications, and cancels upon confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NewsArticleForm {...addArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Discard confirm dialog appears
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('does not cancel when discard confirmation is dismissed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<NewsArticleForm {...addArgs} onCancel={onCancel} />)

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Borrador')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(onCancel).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).not.toBeInTheDocument()
  })
})
