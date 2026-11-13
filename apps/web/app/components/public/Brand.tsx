import Image from 'next/image'
import { useTranslations } from 'next-intl'

type BrandProps = {
  light?: boolean
}

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
        alt={t('ucrLogo')}
        width={576}
        height={600}
        priority
      />
      <Image
        className="ucr-signature-logo"
        src="/brand/firma-horizontal-dos-lineas-cmky.png"
        alt={t('ucr')}
        width={473}
        height={151}
        priority
      />
      <span className="brand-divider" aria-hidden="true" />
      <Image
        className="cinespa-logo"
        src="/brand/logo-cinespa.png"
        alt={t('cinespa')}
        width={1378}
        height={511}
        priority
      />
      <span className="brand-divider" aria-hidden="true" />
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
