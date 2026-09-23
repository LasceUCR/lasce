import type { Metadata } from 'next'

import { SuviPreview } from '@/app/components/public/suvi/SuviPreview'

/**
 * Prueba de concepto sin estilo: muestra la última imagen SUVI que
 * `apps/worker/app/services/suvi_preview.py` publicó para cada canal, servida por
 * `apps/web/app/api/suvi/preview/[satellite]/[channel]/route.ts`. `SuviPreview` sondea esa ruta
 * cada 30 segundos para refrescar las imágenes sin recargar la página. No tiene enlace en la
 * navegación; se accede por URL directa.
 */
export const metadata: Metadata = {
  title: 'SUVI (prueba)',
}

const SATELLITE = 'g19'
const CHANNELS = ['fe093', 'fe131'] as const

export default function SuviPreviewRoute() {
  return (
    <div>
      <h1>SUVI (prueba)</h1>
      <SuviPreview satellite={SATELLITE} channels={CHANNELS} />
    </div>
  )
}
