import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { TranslationReview, type TranslationReviewProps } from './TranslationReview'
import { Confirmed, Pending } from './TranslationReview.stories'

const pendingArgs = Pending.args as TranslationReviewProps

describe('TranslationReview', () => {
  test('explains the review and offers a switch named after the field and language', () => {
    render(<TranslationReview {...pendingArgs} />)

    expect(screen.getByRole('note')).toHaveTextContent(pendingArgs.message)
    expect(
      screen.getByRole('switch', { name: 'La descripción en español sigue siendo correcta' }),
    ).toHaveAttribute('aria-checked', 'false')
  })

  test('reflects a confirmation', () => {
    render(<TranslationReview {...(Confirmed.args as TranslationReviewProps)} />)

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  test('reports the switch being turned on and off', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<TranslationReview {...pendingArgs} onChange={onChange} />)

    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(<TranslationReview {...pendingArgs} checked onChange={onChange} />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  test('gives each switch its own id', () => {
    render(
      <>
        <TranslationReview {...pendingArgs} />
        <TranslationReview {...pendingArgs} />
      </>,
    )

    const [first, second] = screen.getAllByRole('switch')
    expect(first?.id).toBeTruthy()
    expect(first?.id).not.toBe(second?.id)
  })
})
