import { getTranslations } from 'next-intl/server'

/**
 * Layout chrome rather than a leaf presentational component, so it reads its
 * own copy from the catalogue instead of taking it in through props — see
 * "Where a string goes" in `docs/add-a-component.md`.
 */
export async function SkipLink() {
  const t = await getTranslations('layout')

  return (
    <a className="skip-link" href="#main-content">
      {t('skipToContent')}
    </a>
  )
}
