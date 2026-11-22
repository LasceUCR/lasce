import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import en from '@/messages/en.json' with { type: 'json' }
import es from '@/messages/es.json' with { type: 'json' }

import { PasswordRequirements, type PasswordRequirementsProps } from './PasswordRequirements'
import { AllMet, Empty, PartlyMet } from './PasswordRequirements.stories'

const copy = es.auth.passwordRequirements

function renderList(props: PasswordRequirementsProps, locale: 'es' | 'en' = 'es') {
  return renderWithIntl(<PasswordRequirements {...props} />, { locale })
}

/** The list item that holds a requirement's visible label. */
function item(label: string) {
  const element = screen.getByText(label).closest('li')
  if (!element) throw new Error(`No list item for "${label}"`)
  return element
}

describe('PasswordRequirements', () => {
  test('lists every requirement under a title, as a polite live region', () => {
    renderList(Empty.args as PasswordRequirementsProps)

    const list = screen.getByRole('list', { name: copy.title })
    expect(list).toHaveAttribute('aria-live', 'polite')
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    for (const label of Object.values(copy.items)) {
      expect(within(list).getByText(label)).toBeInTheDocument()
    }
  })

  test('marks every requirement as pending while nothing is typed', () => {
    renderList(Empty.args as PasswordRequirementsProps)

    for (const label of Object.values(copy.items)) {
      expect(item(label)).toHaveTextContent(copy.unmet)
    }
  })

  test('marks only the requirements a partial password meets', () => {
    renderList(PartlyMet.args as PasswordRequirementsProps)

    expect(item(copy.items.length)).toHaveTextContent(copy.met)
    expect(item(copy.items.lowercase)).toHaveTextContent(copy.met)
    expect(item(copy.items.uppercase)).toHaveTextContent(copy.unmet)
    expect(item(copy.items.number)).toHaveTextContent(copy.unmet)
    expect(item(copy.items.special)).toHaveTextContent(copy.unmet)
  })

  test('marks every requirement as met for a password the server accepts', () => {
    renderList(AllMet.args as PasswordRequirementsProps)

    for (const label of Object.values(copy.items)) {
      expect(item(label)).toHaveTextContent(copy.met)
    }
  })

  test('updates as the password changes', () => {
    const { rerender } = renderList({ password: 'abc' })
    expect(item(copy.items.number)).toHaveTextContent(copy.unmet)

    rerender(<PasswordRequirements password="abc1" />)
    expect(item(copy.items.number)).toHaveTextContent(copy.met)
  })

  test('follows the visitor language', () => {
    renderList({ password: '' }, 'en')

    expect(
      screen.getByRole('list', { name: en.auth.passwordRequirements.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(en.auth.passwordRequirements.items.special)).toBeInTheDocument()
  })
})
