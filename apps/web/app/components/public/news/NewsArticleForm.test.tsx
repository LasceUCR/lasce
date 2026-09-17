import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { NewsArticleForm, type NewsArticleFormProps } from './NewsArticleForm'
import { AddNew, EditExisting } from './NewsArticleForm.stories'

const editArgs = EditExisting.args as NewsArticleFormProps
const addArgs = AddNew.args as NewsArticleFormProps

// jsdom has no `URL.createObjectURL`; saving with a freshly dropped file calls it.
URL.createObjectURL = vi.fn(() => 'blob:mock-url')
URL.revokeObjectURL = vi.fn()

describe('NewsArticleForm', () => {
  test('pre-fills every field from the article it is given', () => {
    render(<NewsArticleForm {...editArgs} />)

    const article = editArgs.article!
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(article.title)
    expect(screen.getByRole('textbox', { name: 'Autores' })).toHaveValue(article.authors)
    expect(screen.getByRole('img')).toHaveAttribute('src', article.imageUrl)
  })

  test('saves the edited fields, keeping the original image', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<NewsArticleForm {...editArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Nuevo título')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nuevo título',
        authors: [editArgs.article!.authors],
        imageUrl: editArgs.article!.imageUrl,
      }),
    )
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

  test('starts blank for a new article and disables save until the required fields and an image are present', async () => {
    const user = userEvent.setup()
    render(<NewsArticleForm {...addArgs} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Un título')

    // Still disabled: a title alone isn't enough without the other required fields and an image.
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })
})
