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

    expect(document.getElementById('publication-date')).toHaveValue('2026-09-17')

    expect(screen.getByRole('group', { name: 'Autores' })).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: `Eliminar ${defaultArgs.publication.authors[0]}`,
      }),
    ).toBeInTheDocument()

    expect(screen.getByRole('textbox', { name: 'DOI' })).toHaveValue(defaultArgs.publication.DOI)

    expect(screen.getByRole('textbox', { name: 'Revista/Publicación' })).toHaveValue(
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

  test('disables saving when the DOI is blank', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<PublicationForm {...defaultArgs} onSave={onSave} />)

    await user.clear(screen.getByRole('textbox', { name: 'DOI' }))

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
  })

  test('disables saving when there are no authors', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <PublicationForm
        {...defaultArgs}
        publication={{
          ...defaultArgs.publication,
          authors: [],
        }}
        onSave={onSave}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onSave).not.toHaveBeenCalled()
  })

  test('adds an author', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Añadir autor' }))

    const dialog = screen.getByRole('dialog', {
      name: 'Añadir autor',
    })

    await user.type(
      within(dialog).getByRole('textbox', {
        name: 'Nombre del autor',
      }),
      'Carlos González',
    )

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Añadir',
      }),
    )

    expect(
      screen.getByRole('button', {
        name: 'Eliminar Carlos González',
      }),
    ).toBeInTheDocument()
  })

  test('removes an author', async () => {
    const user = userEvent.setup()

    render(<PublicationForm {...defaultArgs} />)

    const removeAuthorButton = screen.getByRole('button', {
      name: 'Eliminar María Rodríguez',
    })

    expect(removeAuthorButton).toBeInTheDocument()

    await user.click(removeAuthorButton)

    expect(
      screen.queryByRole('button', {
        name: 'Eliminar María Rodríguez',
      }),
    ).not.toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Añadir autor' }))

    const addAuthorDialog = screen.getByRole('dialog', {
      name: 'Añadir autor',
    })

    await user.type(
      within(addAuthorDialog).getByRole('textbox', {
        name: 'Nombre del autor',
      }),
      'Nuevo autor',
    )

    await user.click(
      within(addAuthorDialog).getByRole('button', {
        name: 'Añadir',
      }),
    )

    expect(
      screen.getByRole('button', {
        name: 'Eliminar Nuevo autor',
      }),
    ).toBeInTheDocument()

    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('Nuevo título')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()

    // Confirm the form
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const dialog = screen.getByRole('dialog', {
      name: 'Guardar cambios',
    })

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Confirmar',
      }),
    )

    expect(onSave).toHaveBeenCalledWith({
      title: 'Nuevo título',
      abstract: defaultArgs.publication.abstract,
      authors: [...defaultArgs.publication.authors, 'Nuevo autor'],
      DOI: defaultArgs.publication.DOI,
      href: defaultArgs.publication.href,
      researchGroup: defaultArgs.publication.researchGroup,
      venue: defaultArgs.publication.venue,
      date: new Date('2026-09-17T00:00:00'),
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
