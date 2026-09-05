'use client'

import { useEffect } from 'react'
import { destroy, init } from '@webdots/annotate-client'
import { usePathname } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_WEBDOTS_API_URL as string | undefined
const API_KEY = process.env.NEXT_PUBLIC_WEBDOTS_API_KEY as string | undefined

/**
 * Monta el widget de anotación visual de Webdots. Sin NEXT_PUBLIC_WEBDOTS_API_URL el
 * componente no hace nada, así que producción queda limpia por defecto.
 *
 * El widget resuelve su `pageKey` una sola vez, en `init()`, contra el
 * `location` actual; por eso lo remontamos en cada cambio de ruta en lugar de
 * llamar a `refresh()`.
 *
 * Ojo: la limpieza usa el `destroy()` del módulo, no `widget.destroy()`. El
 * método de instancia no libera el singleton interno de la librería, así que
 * el siguiente `init()` (por ejemplo el doble efecto de StrictMode) devolvería
 * la instancia ya destruida y el widget no volvería a aparecer.
 */
export function AnnotateWidget() {
  const pathname = usePathname()

  useEffect(() => {
    if (!API_URL) return

    const widget = init({
      apiUrl: API_URL,
      apiKey: API_KEY,
    })

    widget.refresh()

    return () => destroy()
  }, [pathname])

  return null
}
