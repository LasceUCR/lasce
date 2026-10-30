import { useTranslations } from 'next-intl'

import type { ActivityItem } from '@/app/lib/audit-log'

type TranslateLoose = {
  (key: string, values?: Record<string, string>): string
  has(key: string): boolean
}

type SummarySource = Pick<ActivityItem, 'action' | 'summary' | 'metadata'>

/** The part of a stored summary after "Noticia agregada: ", which is the name of what was touched. */
function nameOf(summary: string): string {
  const separator = summary.indexOf(': ')
  return separator === -1 ? summary : summary.slice(separator + 2)
}

function metadataField(metadata: SummarySource['metadata'], field: string): string | null {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return null
  const value = metadata[field]
  return typeof value === 'string' ? value : null
}

/**
 * Renders an audit event's summary in the site's language. The stored summary is Spanish and is
 * written when the event happens, so the line is rebuilt from the event's `action`, its metadata
 * and the name of what was touched, which the stored summary carries after its first colon. An
 * action with no message in the catalogue falls back to the stored summary.
 */
export function useAuditSummary(): (item: SummarySource) => string {
  // Keys are built from the stored `action`, which the catalogue's key types cannot follow.
  const t = useTranslations('administration.auditSummary') as unknown as TranslateLoose
  const tRoles = useTranslations('access.roles') as unknown as TranslateLoose

  function roleName(role: string | null): string {
    return role && tRoles.has(role) ? tRoles(role) : t('noRole')
  }

  return (item) => {
    const key = item.action.replace('.', '_')
    if (!t.has(`events.${key}`)) return item.summary

    if (item.action === 'user.role_change') {
      const target = /^Rol de (.*) cambiado de /s.exec(item.summary)?.[1]
      return t(`events.${key}`, {
        name: target && target !== 'una cuenta' ? target : t('unknownAccount'),
        previous: roleName(metadataField(item.metadata, 'previousRole')),
        next: roleName(metadataField(item.metadata, 'newRole')),
      })
    }
    if (item.action === 'role_permissions.update') {
      return t(`events.${key}`, { role: roleName(metadataField(item.metadata, 'role')) })
    }
    return t(`events.${key}`, { name: nameOf(item.summary) })
  }
}
