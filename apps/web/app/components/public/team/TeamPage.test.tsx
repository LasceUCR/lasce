import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getTeamContent, teamMembers } from '@/app/lib/team'
import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { TeamPage, type TeamPageProps } from './TeamPage'
import { Default } from './TeamPage.stories'

const defaultArgs = Default.args as TeamPageProps

describe('TeamPage', () => {
  test('has one level-one heading', () => {
    renderWithIntl(<TeamPage {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Equipo de desarrollo' })).toBeVisible()
  })

  test('lists every team member with a mailto link', () => {
    renderWithIntl(<TeamPage {...defaultArgs} />)

    const section = within(screen.getByRole('region', { name: 'Quiénes lo desarrollaron' }))

    expect(teamMembers).toHaveLength(9)
    for (const member of teamMembers) {
      expect(section.getByRole('heading', { name: member.name })).toBeVisible()
      expect(
        section.getByRole('link', { name: `Correo electrónico: ${member.email}` }),
      ).toHaveAttribute('href', `mailto:${member.email}`)
    }
  })

  test('explains the origins, objectives and process of the project', () => {
    renderWithIntl(<TeamPage {...defaultArgs} />)

    const context = within(screen.getByRole('region', { name: 'Contexto del proyecto' }))

    expect(context.getByRole('heading', { name: 'Origen y motivación' })).toBeVisible()
    expect(context.getByRole('heading', { name: 'Objetivos' })).toBeVisible()
    expect(context.getAllByRole('listitem')).toHaveLength(4)
    expect(context.getByRole('heading', { name: 'Proceso de desarrollo' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Agradecimientos' })).toBeVisible()
  })

  test('links back to the home page', () => {
    renderWithIntl(<TeamPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('is available in English', () => {
    const content = getTeamContent(getMessages('en') as Parameters<typeof getTeamContent>[0])

    renderWithIntl(<TeamPage content={content} />, { locale: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Development team' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })
})
