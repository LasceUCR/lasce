import Image from 'next/image'
import { useTranslations } from 'next-intl'

type BrandProps = {
  light?: boolean
}

/**
 * The institutional lockup in the header (or, with `light`, the UCR logo in the footer).
 *
 * The full header lockup is the UCR shield and signature, CINESPA and LASCE. At 430px and below
 * the signature's small type becomes illegible, so `globals.css` reduces it to the UCR shield and
 * LASCE at their own proportions, hiding the signature, CINESPA and the first divider with
 * `display: none` (which also takes them out of the accessibility tree).
 *
 * The shield carries the university's name, so it is announced at every width. The signature
 * repeats that name as lettering and has an empty alt, so the name is never announced twice.
 */
export function Brand({ light = false }: BrandProps) {
  const t = useTranslations('brand')

  if (light) {
    return (
      <div className="brand brand-light">
        <Image src="/brand/logo-UCR-claro.png" alt={t('ucr')} width={109} height={58} />
      </div>
    )
  }

  return (
    <div className="brand">
      <Image
        className="compdes-logo"
        src="/brand/compdes-ucr.png"
        alt={t('ucr')}
        width={576}
        height={600}
        priority
      />
      <Image
        className="ucr-signature-logo"
        src="/brand/firma-horizontal-dos-lineas-cmky.png"
        alt=""
        width={473}
        height={151}
        priority
      />
      <span className="brand-divider brand-divider-cinespa" aria-hidden="true" />
      <Image
        className="cinespa-logo"
        src="/brand/logo-cinespa.png"
        alt={t('cinespa')}
        width={1378}
        height={511}
        priority
      />
      <span className="brand-divider brand-divider-lasce" aria-hidden="true" />
      <Image
        className="lasce-logo"
        src="/brand/lasce_original.png"
        alt={t('lasce')}
        width={1672}
        height={480}
        priority
      />
    </div>
  )
}
