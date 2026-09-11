import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'

import { EditModeProvider, useEditMode } from './EditModeProvider'

// Node 22+'s own global `localStorage` getter/setter shadows jsdom's working
// one here, so `window.localStorage` evaluates to `undefined` rather than a
// Storage — this test-only stand-in is scoped to this file rather than the
// shared vitest.setup.ts.
class MemoryStorage implements Storage {
  #store = new Map<string, string>()

  get length() {
    return this.#store.size
  }

  clear() {
    this.#store.clear()
  }

  getItem(key: string) {
    return this.#store.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.#store.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.#store.delete(key)
  }

  setItem(key: string, value: string) {
    this.#store.set(key, String(value))
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
})

function EditModeConsumer() {
  const { editMode, setEditMode } = useEditMode()
  return (
    <button onClick={() => setEditMode(!editMode)} type="button">
      {editMode ? 'Modo edición activado' : 'Modo edición desactivado'}
    </button>
  )
}

describe('EditModeProvider', () => {
  test('starts with edit mode off when nothing is stored', () => {
    render(
      <EditModeProvider>
        <EditModeConsumer />
      </EditModeProvider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Modo edición desactivado')
  })

  test('toggling edit mode updates every consumer and persists it', async () => {
    const user = userEvent.setup()
    render(
      <EditModeProvider>
        <EditModeConsumer />
      </EditModeProvider>,
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('Modo edición activado')
    expect(window.localStorage.getItem('lasce:cms-edit-mode')).toBe('true')
  })

  test('restores edit mode from a previous session', () => {
    window.localStorage.setItem('lasce:cms-edit-mode', 'true')

    render(
      <EditModeProvider>
        <EditModeConsumer />
      </EditModeProvider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Modo edición activado')
  })

  test('throws a clear error when used outside the provider', () => {
    expect(() => render(<EditModeConsumer />)).toThrow(
      'useEditMode must be used within an EditModeProvider',
    )
  })
})
