import Image from 'next/image'

type BrandProps = {
  light?: boolean
}

export function Brand({ light = false }: BrandProps) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <Image
        src={light ? '/brand/logo-UCR-claro.png' : '/brand/logo-UCR-negro.png'}
        alt="Universidad de Costa Rica"
        width={109}
        height={58}
        priority={!light}
      />
      {!light ? <span className="brand-divider" aria-hidden="true" /> : null}
      {!light ? (
        <Image
          className="lasce-logo"
          src="/brand/Logo_Lasce.jpg"
          alt="Laboratorio de Ciencias Espaciales"
          width={188}
          height={52}
          priority
        />
      ) : null}
    </div>
  )
}
