import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { SuviPreview, type SuviPreviewProps } from './SuviPreview'
import { Default } from './SuviPreview.stories'

const defaultArgs = Default.args as SuviPreviewProps

describe('SuviPreview', () => {
  test('renders one image per channel', () => {
    render(<SuviPreview {...defaultArgs} />)

    for (const channel of defaultArgs.channels) {
      expect(screen.getByRole('img', { name: `SUVI ${channel}` })).toBeInTheDocument()
    }
  })

  test('points each image at its own preview route', () => {
    render(<SuviPreview {...defaultArgs} />)

    const channel = defaultArgs.channels[0]
    const image = screen.getByRole('img', { name: `SUVI ${channel}` })
    const expectedPrefix = `/api/suvi/preview/${defaultArgs.satellite}/${channel}?t=`
    const src = image.getAttribute('src') ?? ''
    expect(src.startsWith(expectedPrefix)).toBe(true)
  })
})
