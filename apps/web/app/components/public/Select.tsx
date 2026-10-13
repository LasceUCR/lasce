'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

import { useFloatingMenu } from './useFloatingMenu'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

export interface SelectProps {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  describedBy?: string
}

export function Select({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  describedBy,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(value)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', time: 0 })
  const pointerOnMenu = useRef(false)
  const expanded = open && !disabled
  const dismissMenu = useCallback(() => setOpen(false), [])
  const { position, placeMenu } = useFloatingMenu({
    open: expanded,
    triggerRef: trigger,
    menuRef: list,
    onDismiss: dismissMenu,
    boundarySelector: '[data-select-boundary]',
  })
  const selected = options.find((option) => option.value === value)
  const enabled = options.filter((option) => !option.disabled)
  // A menu on `document.body` is inert while a modal dialog is open, so hover and clicks never
  // reach it. Inside the dialog it can become a popover and join the top layer.
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const inDialog = portalRoot instanceof HTMLDialogElement

  function showMenu(next = value) {
    setPortalRoot(trigger.current?.closest('dialog') ?? document.body)
    placeMenu()
    setActive(next)
    setOpen(true)
  }

  function choose(next: string) {
    pointerOnMenu.current = false
    onChange(next)
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  useLayoutEffect(() => {
    const menu = list.current
    if (!expanded || !inDialog || !menu) return
    if (typeof menu.showPopover === 'function') {
      try {
        if (!menu.matches(':popover-open')) menu.showPopover()
      } catch {
        menu.removeAttribute('popover')
      }
    }
    // A closed popover is `display: none`. If it could not open, drop the attribute so the
    // menu stays in the dialog, where it can still receive hover and clicks.
    if (menu.hasAttribute('popover') && !menu.matches(':popover-open')) {
      menu.removeAttribute('popover')
    }
    return () => {
      if (typeof menu.hidePopover === 'function' && menu.matches(':popover-open')) {
        menu.hidePopover()
      }
    }
  }, [expanded, inDialog])

  useEffect(() => {
    if (!expanded) return
    const option = document.getElementById(`${id}-option-${active}`)
    const menu = list.current
    if (!option || !menu) return
    // Scroll only the menu; opening a select must not move the document.
    if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight
    }
  }, [active, expanded, id])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab' || event.key === 'Escape') {
      setOpen(false)
      if (event.key === 'Escape' && expanded) event.preventDefault()
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const index = enabled.findIndex((option) => option.value === active)
      const next =
        event.key === 'Home'
          ? enabled[0]
          : event.key === 'End'
            ? enabled.at(-1)
            : enabled[
                Math.max(
                  0,
                  Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                )
              ]
      if (!expanded) showMenu(event.key === 'Home' || event.key === 'End' ? next?.value : value)
      else if (next) setActive(next.value)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (expanded && enabled.some((option) => option.value === active)) choose(active)
      else showMenu()
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const text = (Date.now() - search.current.time < 700 ? search.current.text : '') + event.key
      search.current = { text, time: Date.now() }
      const match = enabled.find((option) =>
        option.label.toLocaleLowerCase().startsWith(text.toLocaleLowerCase()),
      )
      if (match) {
        if (expanded) setActive(match.value)
        else showMenu(match.value)
      }
    }
  }

  return (
    <>
      <button
        aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
        aria-controls={expanded ? `${id}-options` : undefined}
        aria-describedby={describedBy}
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-label={label}
        className="select-trigger"
        disabled={disabled}
        id={id}
        onBlur={(event) => {
          if (pointerOnMenu.current) {
            pointerOnMenu.current = false
            return
          }
          const next = event.relatedTarget
          if (next instanceof Node && list.current?.contains(next)) return
          setOpen(false)
        }}
        onClick={() => (expanded ? setOpen(false) : showMenu())}
        onKeyDown={handleKeyDown}
        ref={trigger}
        role="combobox"
        type="button"
        value={value}
      >
        <span>{selected?.label ?? 'Seleccione una opción'}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {expanded &&
        createPortal(
          <div
            aria-label={label}
            className="select-menu"
            id={`${id}-options`}
            onMouseDown={(event) => {
              pointerOnMenu.current = true
              event.preventDefault()
            }}
            popover={inDialog ? 'manual' : undefined}
            ref={list}
            role="listbox"
            style={position}
          >
            {options.map((option, index) => (
              <div key={option.value} role="presentation">
                {option.group && option.group !== options[index - 1]?.group ? (
                  <div className="select-group" role="presentation">
                    {option.group}
                  </div>
                ) : null}
                <div
                  aria-disabled={option.disabled || undefined}
                  aria-selected={value === option.value}
                  className="select-option"
                  data-active={active === option.value || undefined}
                  id={`${id}-option-${option.value}`}
                  onClick={() => !option.disabled && choose(option.value)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                >
                  <span>{option.label}</span>
                  {value === option.value ? <Check aria-hidden="true" size={16} /> : null}
                </div>
              </div>
            ))}
          </div>,
          portalRoot ?? document.body,
        )}
    </>
  )
}
