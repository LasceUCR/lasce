import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { PublicationForm, type PublicationFormProps } from './PublicationForm'
import { Default } from './PublicationForm.stories'

const defaultArgs = Default.args as PublicationFormProps

describe('PublicationForm', () => {
  test('starts pre-filled with the publication being edited', () => {
    render(<PublicationForm {...defaultArgs} />)

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue(
      defaultArgs.publication.title,
    )

    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-09-17')

    expect(screen.getByRole('textbox', { name: 'Autor 1' })).toHaveValue(
      defaultArgs.publication.authors[0],
    )

    expect(screen.getByRole('textbox', { name: 'Autor 2' })).toHaveValue(
      defaultArgs.publication.authors[1],
    )

    expect(screen.getByRole('textbox', { name: 'Autor 3' })).toHaveValue(
      defaultArgs.publication.authors[2],
    )

    expect(screen.getByRole('textbox', { name: 'DOI' })).toHaveValue(defaultArgs.publication.DOI)

    expect(screen.getByRole('textbox', { name: 'Revista/Fuente' })).toHaveValue(
      defaultArgs.publication.venue,
    )

    expect(screen.getByRole('textbox', { name: 'Resumen' })).toHaveValue(
      defaultArgs.publication.abstract,
    )

    expect(screen.getByRole('combobox', { name: 'Grupo' })).toHaveValue(
      defaultArgs.publication.researchGroup,
    )
  })

  test('calls onCancel directly, without asking for confirmation', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(<PublicationForm {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('disables saving when the title is cleared', async () => {
    const user = userEvent.setup()

    render(<PublicationForm {...defaultArgs} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('disables saving when an author is empty', async () => {
    const user = userEvent.setup()

    render(<PublicationForm {...defaultArgs} />)

    await user.clear(screen.getByRole('textbox', { name: 'Autor 1' }))

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })

  test('adds an author field', async () => {
    const user = userEvent.setup()

    render(
      <PublicationForm
        {...defaultArgs}
        publication={{
          ...defaultArgs.publication,
          authors: ['Juan Pérez', 'María Rodríguez'],
        }}
      />,
    )

    expect(screen.queryByRole('textbox', { name: 'Autor 3' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Añadir autor' }))

    expect(screen.getByRole('textbox', { name: 'Autor 3' })).toBeInTheDocument()
  })

  test('removes an author field', async () => {
    const user = userEvent.setup()

    render(<PublicationForm {...defaultArgs} />)

    expect(screen.getByRole('textbox', { name: 'Autor 2' })).toHaveValue('María Rodríguez')

    const authorRow = screen
      .getByRole('textbox', { name: 'Autor 2' })
      .closest('.publication-author-row')

    expect(authorRow).not.toBeNull()

    await user.click(
      within(authorRow as HTMLElement).getByRole('button', {
        name: 'Eliminar',
      }),
    )

    expect(screen.getByRole('textbox', { name: 'Autor 2' })).toHaveValue('Carlos González')

    expect(screen.queryByDisplayValue('María Rodríguez')).not.toBeInTheDocument()
  })

  test('asks for confirmation before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<PublicationForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()

    expect(screen.getByRole('dialog', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  test('saves the edited values once the confirmation is accepted', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<PublicationForm {...defaultArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'Título' }))

    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Nuevo título')

    await user.clear(screen.getByRole('textbox', { name: 'Autor 1' }))

    await user.type(screen.getByRole('textbox', { name: 'Autor 1' }), 'Nuevo autor')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', {
      name: 'Guardar cambios',
    })

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Nuevo título',
      abstract: defaultArgs.publication.abstract,
      authors: ['Nuevo autor', ...defaultArgs.publication.authors.slice(1)],
      DOI: defaultArgs.publication.DOI,
      researchGroup: defaultArgs.publication.researchGroup,
      venue: defaultArgs.publication.venue,
      date: new Date('2026-09-17'),
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('does not save when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<PublicationForm {...defaultArgs} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', {
      name: 'Guardar cambios',
    })

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
