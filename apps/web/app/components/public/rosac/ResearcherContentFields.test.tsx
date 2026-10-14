import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import {
  ResearcherContentFields,
  type ResearcherContentFieldsProps,
  type ResearcherContentHandle,
} from './ResearcherContentFields'
import { Create, Default, Legacy } from './ResearcherContentFields.stories'

const defaultArgs = Default.args as ResearcherContentFieldsProps
const createArgs = Create.args as ResearcherContentFieldsProps
const legacyArgs = Legacy.args as ResearcherContentFieldsProps

type User = ReturnType<typeof userEvent.setup>

function tab(name: RegExp) {
  return screen.getByRole('tab', { name })
}

/** A field's accessible name also carries its error message, so match on the label's start. */
function field(label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.getByRole('textbox', { name: new RegExp(`^${escaped}`) })
}

async function replace(user: User, label: string, value: string) {
  const input = field(label)
  await user.clear(input)
  if (value) await user.type(input, value)
}

function renderFields(props: ResearcherContentFieldsProps) {
  const ref = createRef<ResearcherContentHandle>()
  renderWithIntl(<ResearcherContentFields {...props} ref={ref} />)
  return ref
}

describe('ResearcherContentFields', () => {
  test('opens on the Spanish tab with the stored Spanish text', () => {
    renderFields(defaultArgs)

    expect(tab(/^Español/)).toHaveAttribute('aria-selected', 'true')
    expect(field('Rol (Español)')).toHaveValue(defaultArgs.editing?.content.es.role)
    expect(field('Descripción (Español)')).toHaveValue(
      defaultArgs.editing?.content.es.description,
    )
    expect(screen.queryByRole('textbox', { name: /^Rol \(English\)/ })).not.toBeInTheDocument()
  })

  test('shows the English text on the English tab, marked as English', async () => {
    const user = userEvent.setup()
    renderFields(defaultArgs)

    await user.click(tab(/^English/))

    expect(field('Rol (English)')).toHaveValue('Principal investigator')
    expect(field('Rol (English)')).toHaveAttribute('lang', 'en')
  })

  test('keeps what was typed when switching tabs', async () => {
    const user = userEvent.setup()
    renderFields(defaultArgs)

    await replace(user, 'Rol (Español)', 'Otro rol')
    await user.click(tab(/^English/))
    await user.click(tab(/^Español/))

    expect(field('Rol (Español)')).toHaveValue('Otro rol')
  })

  test('starts blank when creating', () => {
    renderFields(createArgs)

    expect(field('Rol (Español)')).toHaveValue('')
    expect(field('Descripción (Español)')).toHaveValue('')
  })

  test('explains a legacy researcher on each tab and leaves its base text without a language', async () => {
    const user = userEvent.setup()
    renderFields(legacyArgs)

    expect(screen.getByText(/podría no estar en español/)).toBeInTheDocument()
    expect(field('Rol (Español)')).toHaveAttribute('lang', '')

    await user.click(tab(/^English/))
    expect(screen.getByText(/aún no tiene versión en inglés/)).toBeInTheDocument()
    expect(field('Rol (English)')).toHaveValue('')
  })

  test('is not dirty until something changes while editing', async () => {
    const user = userEvent.setup()
    const ref = renderFields(defaultArgs)
    expect(ref.current?.isDirty()).toBe(false)

    await user.type(field('Rol (Español)'), ' editado')

    expect(ref.current?.isDirty()).toBe(true)
  })

  test('is dirty when creating only once something is typed', async () => {
    const user = userEvent.setup()
    const ref = renderFields(createArgs)
    expect(ref.current?.isDirty()).toBe(false)

    await user.type(field('Rol (Español)'), 'Investigador')

    expect(ref.current?.isDirty()).toBe(true)
  })

  test('has no content to send while the text is unchanged', () => {
    const ref = renderFields(defaultArgs)

    expect(ref.current?.result()).toEqual({ content: null, confirmedUnchanged: [] })
  })

  test('reports invalid fields, opening the tab that has the error', () => {
    const ref = renderFields(createArgs)

    let valid = true
    act(() => {
      valid = ref.current?.validate() ?? true
    })

    expect(valid).toBe(false)
    expect(screen.getByText('El rol en español es obligatorio.')).toBeInTheDocument()
  })

  test('sends both languages in full, with a missing description as null', async () => {
    const user = userEvent.setup()
    const ref = renderFields(createArgs)

    await user.type(field('Rol (Español)'), 'Investigador')
    await user.click(tab(/^English/))
    await user.type(field('Rol (English)'), 'Researcher')

    let valid = false
    act(() => {
      valid = ref.current?.validate() ?? false
    })

    expect(valid).toBe(true)
    expect(ref.current?.result()).toEqual({
      content: {
        es: { role: 'Investigador', description: null },
        en: { role: 'Researcher', description: null },
      },
      confirmedUnchanged: [],
    })
  })
})
