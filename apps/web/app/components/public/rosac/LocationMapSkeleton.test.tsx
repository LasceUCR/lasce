import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { LocationMapSkeleton } from './LocationMapSkeleton'
import { Loading, Quiet } from './LocationMapSkeleton.stories'

describe('LocationMapSkeleton', () => {
  test('reserves the map and announces the load, with nothing that can take focus', () => {
    const { container } = render(<LocationMapSkeleton {...Loading.args} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando el mapa…')
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('stays silent when a parent already announces the load', () => {
    const { container } = render(<LocationMapSkeleton {...Quiet.args} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(container.firstElementChild).not.toHaveAttribute('aria-busy')
  })
})
