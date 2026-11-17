import es from '@/messages/es.json' with { type: 'json' }

/**
 * The content of `/equipo-de-desarrollo`: who built the portal and the project's background.
 *
 * The names and addresses are the same in every language and live here, in source, as agreed for
 * this page (there is no editing for it). The translatable copy is in the `team` namespace of
 * `apps/web/messages/`.
 */
export interface TeamMember {
  name: string
  email: string
}

export const teamMembers: readonly TeamMember[] = [
  { name: 'Isabella Rodriguez', email: 'isabellarodriguez18@gmail.com' },
  { name: 'Aldo Cascante', email: 'cascante.aldo@gmail.com' },
  { name: 'Tatiana Paramo', email: 'gipsyparamolopez@gmail.com' },
  { name: 'Ignacio Cerdas', email: 'cerdasignacio5@gmail.com' },
  { name: 'Sebastián Bolaños', email: 'sebastian@bolanos.cr' },
  { name: 'Andrés Murillo', email: 'andresmimi@gmail.com' },
  { name: 'Josué Torres', email: 'dev.josue.torres@gmail.com' },
  { name: 'Aarón Santana', email: 'contact@savaldev.com' },
  { name: 'Gabriel Serrano', email: 'serranogabo10@gmail.com' },
]

export interface TeamContent {
  hero: { kicker: string; title: string; lead: string }
  team: {
    title: string
    intro: string
    emailLabel: string
    memberLabel: string
    members: readonly TeamMember[]
  }
  background: {
    title: string
    origin: { title: string; body: string }
    objectives: { title: string; intro: string; items: readonly string[] }
    process: { title: string; body: string }
  }
  acknowledgments: { title: string; body: string; notice: string }
  backLink: { href: string; label: string }
}

/** The parts of a message catalogue the page reads. */
export type TeamMessages = Pick<typeof es, 'team' | 'common'>

export function getTeamContent({ team, common }: TeamMessages): TeamContent {
  return {
    hero: team.hero,
    team: { ...team.team, members: teamMembers },
    background: {
      ...team.background,
      objectives: {
        title: team.background.objectives.title,
        intro: team.background.objectives.intro,
        items: [
          team.background.objectives.item1,
          team.background.objectives.item2,
          team.background.objectives.item3,
          team.background.objectives.item4,
        ],
      },
    },
    acknowledgments: team.acknowledgments,
    backLink: { href: '/', label: common.backToHome },
  }
}

/** The page in Spanish, the source language. For stories and tests. */
export const teamContent: TeamContent = getTeamContent(es)
