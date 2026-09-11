import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'

import { Default, Empty } from './NewsExplorer.stories'
import { NewsExplorer, type NewsExplorerProps } from './NewsExplorer'

const defaultArgs = Default.args as NewsExplorerProps
const emptyArgs = Empty.args as NewsExplorerProps

function renderExplorer(props: NewsExplorerProps, editMode = false) {
  return render(
    <EditModeContext.Provider value={{ editMode, setEditMode: () => {} }}>
      <NewsExplorer {...props} />
    </EditModeContext.Provider>,
  )
}

describe('NewsExplorer', () => {
  test('renders one card per news article it is given', () => {
    renderExplorer(defaultArgs)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(defaultArgs.news.length)
  })

  test('narrows the list to news matching the search query', async () => {
    const user = userEvent.setup()
    renderExplorer(defaultArgs)

    const article = defaultArgs.news[0]!

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.title)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  test('matches by source as well as by title', async () => {
    const user = userEvent.setup()
    renderExplorer(defaultArgs)

    const article = defaultArgs.news[0]!

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.source)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()
  })

  test('matches by author as well as by title', async () => {
    const user = userEvent.setup()
    renderExplorer(defaultArgs)

    const article = defaultArgs.news.find((item) => item.authors.trim() !== '')

    if (!article) {
      throw new Error('Expected at least one news article with an author')
    }

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.authors)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()
  })

  test('shows an empty state when there are no news items', () => {
    renderExplorer(emptyArgs)

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('No hay noticias publicadas todavía.')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('shows an empty state when nothing matches the search query, without losing the heading', async () => {
    const user = userEvent.setup()
    renderExplorer(defaultArgs)

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar noticias' }),
      'xyz-no-existe-esta-noticia',
    )

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron noticias')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('shows no edit affordances when edit mode is off', () => {
    renderExplorer(defaultArgs, false)

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar noticia' })).not.toBeInTheDocument()
  })

  test('deletes an article once its delete action is confirmed', async () => {
    const user = userEvent.setup()
    renderExplorer(defaultArgs, true)

    const article = defaultArgs.news[0]!

    await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('heading', { name: article.title })).not.toBeInTheDocument()
  })

  test('opens a blank article form when the "Agregar noticia" template card is pressed', async () => {
    const user = userEvent.setup()
    renderExplorer(defaultArgs, true)

    await user.click(screen.getByRole('button', { name: 'Agregar noticia' }))

    expect(screen.getByRole('dialog', { name: 'Agregar noticia' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('')
  })
})
