import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { AlbumMediaGrid, type AlbumMediaGridProps } from './AlbumMediaGrid'
import { Default, SingleFile } from './AlbumMediaGrid.stories'

const defaultArgs = Default.args as AlbumMediaGridProps
const singleArgs = SingleFile.args as AlbumMediaGridProps

function fileAt(index: number) {
  const item = defaultArgs.media[index]

  if (!item) {
    throw new Error(`The story fixture has no file at index ${index}.`)
  }

  return item
}

const first = fileAt(0)
const second = fileAt(1)
const last = fileAt(defaultArgs.media.length - 1)

function openTile(title: string) {
  return screen.getByRole('button', { name: `Ver a tamaño completo: ${title}` })
}

describe('AlbumMediaGrid', () => {
  test('offers one full-size control per file, named after it', () => {
    render(<AlbumMediaGrid {...defaultArgs} />)

    for (const item of defaultArgs.media) {
      expect(openTile(item.title)).toBeInTheDocument()
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('labels a video so it is not distinguished by its icon alone', () => {
    render(<AlbumMediaGrid {...defaultArgs} />)

    expect(screen.getAllByText('Video')).toHaveLength(1)
  })

  test('opens the chosen file in the lightbox with its metadata', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(second.title))

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { level: 3, name: second.title }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(`Formato: ${second.format}`)).toBeInTheDocument()
    expect(within(dialog).getByText(`Subido por: ${second.uploader}`)).toBeInTheDocument()
  })

  test('wraps around when paging past either end of the album', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(first.title))
    await user.click(screen.getByRole('button', { name: 'Anterior' }))

    expect(screen.getByRole('heading', { level: 3, name: last.title })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByRole('heading', { level: 3, name: first.title })).toBeInTheDocument()
  })

  test('closes on Escape and returns focus to the tile that opened it', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...defaultArgs} />)

    await user.click(openTile(second.title))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openTile(second.title)).toHaveFocus()
  })

  test('keeps the arrows working for an album with a single file', async () => {
    const user = userEvent.setup()
    render(<AlbumMediaGrid {...singleArgs} />)

    await user.click(openTile(first.title))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByRole('heading', { level: 3, name: first.title })).toBeInTheDocument()
  })
})
