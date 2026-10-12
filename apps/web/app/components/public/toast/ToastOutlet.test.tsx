import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { Modal } from '@/app/components/public/Modal'

describe('ToastOutlet', () => {
  test('renders nothing inside a Modal when there is no ToastProvider', () => {
    render(
      <Modal onClose={() => {}} open title="Formulario">
        <p>Contenido</p>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Formulario' })
    expect(dialog.querySelector('[aria-live]')).toBeNull()
  })
})
