import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { useAuditSummary } from './useAuditSummary'

function Summary(props: { action: string; summary: string; metadata?: Record<string, string> }) {
  const summarize = useAuditSummary()
  return <p>{summarize({ ...props, metadata: props.metadata ?? null })}</p>
}

describe('useAuditSummary', () => {
  test('rebuilds the line of a named event in English', () => {
    renderWithIntl(
      <Summary action="publication.create" summary="Publicación agregada: Solar flares" />,
      { locale: 'en' },
    )

    expect(screen.getByText('Publication added: Solar flares')).toBeInTheDocument()
  })

  test('keeps a name that contains a colon whole', () => {
    renderWithIntl(<Summary action="news.update" summary="Noticia actualizada: Sol: un año" />, {
      locale: 'en',
    })

    expect(screen.getByText('News article updated: Sol: un año')).toBeInTheDocument()
  })

  test('translates the roles of a role change', () => {
    renderWithIntl(
      <Summary
        action="user.role_change"
        summary="Rol de Ana cambiado de Visitante a Asistente"
        metadata={{ previousRole: 'VISITOR', newRole: 'ASSISTANT' }}
      />,
      { locale: 'en' },
    )

    expect(screen.getByText("Ana's role changed from Visitor to Assistant")).toBeInTheDocument()
  })

  test('shows the stored summary for an action it has no message for', () => {
    renderWithIntl(<Summary action="widget.explode" summary="Algo pasó" />, { locale: 'en' })

    expect(screen.getByText('Algo pasó')).toBeInTheDocument()
  })
})
