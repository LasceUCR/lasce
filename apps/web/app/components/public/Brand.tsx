import Image from 'next/image'

type BrandProps = {
  light?: boolean
}

export function Brand({ light = false }: BrandProps) {
  if (light) {
    return (
      <div className="brand brand-light">
        <Image
          src="/brand/logo-UCR-claro.png"
          alt="Universidad de Costa Rica"
          width={109}
          height={58}
        />
      </div>
    )
  }

  return (
    <div className="brand">
      <Image
        className="compdes-logo"
        src="/brand/compdes-ucr.png"
        alt="Comisión de Personas Directores y Subdirectores de Escuelas y Sedes Regionales"
        width={576}
        height={600}
        priority
      />
      <Image
        className="ucr-signature-logo"
        src="/brand/firma-horizontal-dos-lineas-cmky.png"
        alt="Universidad de Costa Rica"
        width={473}
        height={151}
        priority
      />
      <span className="brand-divider" aria-hidden="true" />
      <Image
        className="lasce-logo"
        src="/brand/Logo_Lasce.jpg"
        alt="Laboratorio de Ciencias Espaciales"
        width={188}
        height={52}
        priority
      />
    </div>
  )
}
