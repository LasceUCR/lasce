import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { SuviImageSequence, type SuviImageSequenceProps } from './SuviImageSequence'
import { Default } from './SuviImageSequence.stories'

describe('SuviImageSequence', () => {
  test('labels the observed solar image and its UTC capture time', () => {
    render(<SuviImageSequence {...(Default.args as SuviImageSequenceProps)} />)

    expect(screen.getByRole('list', { name: 'Secuencia de imágenes solares' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Imagen solar de demostración/ })).toBeInTheDocument()
    expect(screen.getByText('2026-09-10 08:30 UTC')).toBeInTheDocument()
  })
})
