import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { MediaFrame, type MediaFrameProps } from './MediaFrame'
import { Placeholder, VideoPlaceholder, WithImage } from './MediaFrame.stories'

const imageArgs = WithImage.args as MediaFrameProps
const placeholderArgs = Placeholder.args as MediaFrameProps
const videoArgs = VideoPlaceholder.args as MediaFrameProps

describe('MediaFrame', () => {
  test('shows the image when the file has one', () => {
    render(<MediaFrame {...imageArgs} />)

    expect(screen.getByRole('img', { name: imageArgs.alt })).toHaveAttribute(
      'src',
      imageArgs.src ?? '',
    )
    expect(screen.queryByText(imageArgs.placeholder)).not.toBeInTheDocument()
  })

  test('describes the missing file instead of rendering a broken image', () => {
    render(<MediaFrame {...placeholderArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Foto: Cimentación de la plataforma')).toBeInTheDocument()
  })

  test('tells video apart from photography in the placeholder', () => {
    render(<MediaFrame {...videoArgs} />)

    expect(screen.getByText('Video: Ensamblaje del reflector parabólico')).toBeInTheDocument()
  })
})
