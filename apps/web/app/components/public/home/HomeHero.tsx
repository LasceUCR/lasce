export interface HomeHeroProps {
  title: string
  lead: string
  /**
   * The language `title` and `lead` are in, from `contentLangAttribute`: `''` for text whose
   * language is unknown, and no attribute when it is the page's.
   */
  contentLang?: string
}

/** The hero banner's heading, rule and subtitle. */
export function HomeHero({ title, lead, contentLang }: HomeHeroProps) {
  return (
    <>
      <h1 lang={contentLang}>{title}</h1>
      <span className="hero-rule" aria-hidden="true" />
      <p lang={contentLang}>{lead}</p>
    </>
  )
}
