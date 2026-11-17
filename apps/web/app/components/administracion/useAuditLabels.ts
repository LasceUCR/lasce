import { useTranslations } from 'next-intl'

type TranslateLoose = {
  (key: string): string
  has(key: string): boolean
}

/** `research_area.delete` as plain words, for a code the catalogue has no label for. */
function humanize(code: string): string {
  const words = code.replace(/[._]+/g, ' ').trim()
  return words === '' ? words : words.charAt(0).toUpperCase() + words.slice(1)
}

export interface AuditLabels {
  /** "Research area deleted" for `research_area.delete`. */
  action: (code: string) => string
  /** "Research area" for `research_area`. */
  entity: (code: string) => string
}

/**
 * Readable names for the codes stored on an audit event, in the site's language. The wording
 * follows "Recent activity" on the administration summary. A code the catalogue does not know
 * falls back to its own words, so a new kind of event never breaks the page.
 */
export function useAuditLabels(): AuditLabels {
  // Keys are built from stored codes, which the catalogue's key types cannot follow.
  const t = useTranslations('administration.auditLabels') as unknown as TranslateLoose

  return {
    action: (code) => {
      const key = `actions.${code.replace('.', '_')}`
      return t.has(key) ? t(key) : humanize(code)
    },
    entity: (code) => {
      const key = `entities.${code}`
      return t.has(key) ? t(key) : humanize(code)
    },
  }
}
