import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  PublicationAuthorsField,
  type PublicationAuthorsFieldProps,
} from './PublicationAuthorsField'
import { Many } from './PublicationAuthorsField.stories'

const manyAuthors = (Many.args as PublicationAuthorsFieldProps).authors

/** Owns the list, as the publication form does, and reports every change. */
function Harness({
  authors: initial,
  onChange,
  ...props
}: Partial<PublicationAuthorsFieldProps> & { onChange?: (authors: string[]) => void }) {
  const [authors, setAuthors] = useState(initial ?? [])
  return (
    <PublicationAuthorsField
      {...props}
      authors={authors}
      onChange={(next) => {
        setAuthors(next)
        onChange?.(next)
      }}
    />
  )
}

function input() {
  return screen.getByRole('textbox', { name: 'Nombre del autor' })
}

function chips() {
  return within(screen.getByRole('list', { name: 'Autores seleccionados' })).getAllByRole(
    'listitem',
  )
}

describe('PublicationAuthorsField', () => {
  test('adds an author with the Agregar button and with Enter, then clears the box', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithIntl(<Harness onChange={onChange} required />)

    expect(screen.getByRole('group', { name: 'Autores' })).toBeInTheDocument()
    expect(screen.getByText('Sin autores')).toBeInTheDocument()
    expect(input()).toHaveAttribute('placeholder', 'Escribir un autor...')

    await user.type(input(), '  Ana Mora ')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await user.type(input(), 'Luis Pérez{Enter}')

    expect(onChange).toHaveBeenLastCalledWith(['Ana Mora', 'Luis Pérez'])
    expect(input()).toHaveValue('')
    expect(screen.getByText('2 autores')).toBeInTheDocument()
    expect(input()).toHaveAttribute('placeholder', 'Escribir otro autor...')
  })

  test('refuses a blank name and a name already in the list, in any case', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithIntl(<Harness authors={['Ana Mora']} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('El nombre del autor es obligatorio.')
    expect(input()).toHaveAttribute('aria-invalid', 'true')

    await user.type(input(), 'ANA MORA{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Ese autor ya fue agregado.')
    expect(onChange).not.toHaveBeenCalled()

    await user.type(input(), 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('removes an author', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithIntl(<Harness authors={['Ana Mora', 'Luis Pérez']} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar Ana Mora' }))

    expect(onChange).toHaveBeenLastCalledWith(['Luis Pérez'])
    expect(screen.getByText('1 autor')).toBeInTheDocument()
  })

  test('shows three authors and "+N más", and expands and collapses the rest', async () => {
    const user = userEvent.setup()
    renderWithIntl(<Harness authors={manyAuthors} />)

    expect(screen.getByText('6 autores')).toBeInTheDocument()
    expect(chips().map((chip) => chip.textContent)).toEqual([
      'David Michael Gale',
      'Carolina Salas Matamoros',
      'Miguel Velázquez',
      '+3 más: Ver todos los autores',
    ])

    const toggle = screen.getByRole('button', { name: '+3 más: Ver todos los autores' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)

    // The six names, and "Mostrar menos" after them.
    expect(chips()).toHaveLength(7)
    expect(screen.queryByText('+3 más')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Mostrar menos' }))
    expect(chips()).toHaveLength(4)
  })

  test('offers no toggle with three authors or fewer', () => {
    renderWithIntl(<Harness authors={manyAuthors.slice(0, 3)} />)

    expect(chips()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Ver todos los autores/ })).not.toBeInTheDocument()
  })

  test('shows the form error on the box, so the form can focus it', () => {
    renderWithIntl(<Harness error="Debe existir al menos un autor." />)

    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription('Debe existir al menos un autor.')
  })

  test('speaks the site language', async () => {
    const user = userEvent.setup()
    renderWithIntl(<Harness authors={manyAuthors} />, { locale: 'en' })

    expect(screen.getByRole('group', { name: 'Authors' })).toBeInTheDocument()
    expect(screen.getByText('6 authors')).toBeInTheDocument()
    expect(screen.getByText('+3 more')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+3 more: Show all authors' }))
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Author name' })).toHaveAttribute(
      'placeholder',
      'Type another author...',
    )
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })
})
