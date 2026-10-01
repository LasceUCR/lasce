'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'

interface UseFloatingMenuOptions {
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  menuRef: RefObject<HTMLElement | null>
  onDismiss: () => void
  boundarySelector?: string
}

/**
 * Positions and dismisses a portalled panel. Call placeMenu before opening to avoid a jump.
 * Selection, keyboard handling and focus stay with the caller.
 */
export function useFloatingMenu({
  open,
  triggerRef,
  menuRef,
  onDismiss,
  boundarySelector,
}: UseFloatingMenuOptions) {
  const [position, setPosition] = useState<CSSProperties>({})

  const placeMenu = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const boundary = boundarySelector ? trigger.closest<HTMLElement>(boundarySelector) : null
    const boundaryRect = boundary?.getBoundingClientRect()
    const viewport = window.visualViewport
    const top = viewport?.offsetTop ?? 0
    const left = viewport?.offsetLeft ?? 0
    const height = viewport?.height ?? window.innerHeight
    const width = viewport?.width ?? window.innerWidth
    const menuInset = 8
    const viewportInset = 12
    const gap = 6
    const availableTop = Math.max(top + viewportInset, (boundaryRect?.top ?? top) + menuInset)
    const availableRight = Math.min(
      left + width - viewportInset,
      (boundaryRect?.right ?? left + width) - menuInset,
    )
    const availableBottom = Math.min(
      top + height - viewportInset,
      (boundaryRect?.bottom ?? top + height) - menuInset,
    )
    const availableLeft = Math.max(left + viewportInset, (boundaryRect?.left ?? left) + menuInset)
    const below = availableBottom - rect.bottom - gap
    const above = rect.top - availableTop - gap
    const upwards = below < 160 && above > below
    const menuWidth = Math.min(rect.width, availableRight - availableLeft)
    setPosition({
      position: 'fixed',
      left: Math.max(availableLeft, Math.min(rect.left, availableRight - menuWidth)),
      width: menuWidth,
      maxHeight: Math.max(0, Math.min(320, upwards ? above : below)),
      ...(upwards ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
    })
  }, [boundarySelector, triggerRef])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Node &&
        (triggerRef.current?.contains(target) || menuRef.current?.contains(target))
      )
        return
      onDismiss()
    }
    const reposition = (event: Event) => {
      // Resize and visual viewport events target EventTargets that are not DOM nodes.
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return
      placeMenu()
    }
    const viewport = window.visualViewport
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    viewport?.addEventListener('resize', reposition)
    viewport?.addEventListener('scroll', reposition)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      viewport?.removeEventListener('resize', reposition)
      viewport?.removeEventListener('scroll', reposition)
    }
  }, [menuRef, onDismiss, open, placeMenu, triggerRef])

  return { position, placeMenu }
}
