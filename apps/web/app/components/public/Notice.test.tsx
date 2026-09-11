import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { Notice, type NoticeProps } from './Notice'
import { Error as ErrorStory, Information, Loading } from './Notice.stories'

describe('Notice', () => {
  test('keeps static information outside the live alert channel', () => {
    render(<Notice {...(Information.args as NoticeProps)} />)
    expect(screen.getByRole('note')).toHaveTextContent('Observaciones disponibles')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('announces errors with their readable message', () => {
    render(<Notice {...(ErrorStory.args as NoticeProps)} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible consultar los datos.')
  })

  test('announces progress through a status region', () => {
    render(<Notice {...(Loading.args as NoticeProps)} />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Consultando las observaciones disponibles…',
    )
  })
})
