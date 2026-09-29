'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

import type { SelectOption } from '../Select'

export interface InstrumentProductSelectProps {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  describedBy?: string
}

export function InstrumentProductSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  describedBy,
}: InstrumentProductSelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(`option-${value}`)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [position, setPosition] = useState<CSSProperties>({})
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', time: 0 })
  const expanded = open && !disabled
  const selected = options.find((option) => option.value === value)
  const groups = Array.from(new Set(options.map((option) => option.group))).map((label, index) => ({
    key: `group-${index}`,
    label: label ?? 'Opciones',
    options: options.filter((option) => option.group === label),
  }))
  const optionNodes = (items: SelectOption[]) =>
    items
      .filter((option) => !option.disabled)
      .map((option) => ({
        key: `option-${option.value}`,
        label: option.label,
      }))
  const roots = groups.map(({ key, label }) => ({ key, label }))
  const enabled = groups.flatMap((group) => [
    { key: group.key, label: group.label },
    ...(openGroup === group.key ? optionNodes(group.options) : []),
  ])

  function placeMenu() {
    const rect = trigger.current!.getBoundingClientRect()
    const boundary = trigger.current!.closest<HTMLElement>('[data-select-boundary]')
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
  }

  function showMenu(next?: string) {
    placeMenu()
    setOpenGroup(null)
    setActive(
      next ??
        groups.find((group) => group.options.some((option) => option.value === value))?.key ??
        roots[0]?.key ??
        '',
    )
    setOpen(true)
  }

  function toggleGroup(key: string) {
    setActive(key)
    setOpenGroup((current) => (current === key ? null : key))
  }

  function activate() {
    if (groups.some((group) => group.key === active)) toggleGroup(active)
    else {
      const option = options.find((item) => `option-${item.value}` === active && !item.disabled)
      if (option) choose(option.value)
    }
  }

  function choose(next: string) {
    onChange(next)
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!expanded) return
    const closeOutside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !list.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    const reposition = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) placeMenu()
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    window.visualViewport?.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('scroll', reposition)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      window.visualViewport?.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('scroll', reposition)
    }
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const menu = list.current
    if (!menu) return
    function revealActive() {
      const item = document.getElementById(`${id}-${active}`)
      const option = item?.hasAttribute('aria-expanded')
        ? (item.firstElementChild as HTMLElement)
        : item
      if (!option || !menu) return
      // Keep the heading and first products visible after expanding short mobile menus.
      if (
        openGroup === active &&
        item &&
        item.offsetTop + item.offsetHeight > menu.scrollTop + menu.clientHeight
      ) {
        menu.scrollTop = Math.min(
          option.offsetTop,
          item.offsetTop + item.offsetHeight - menu.clientHeight,
        )
        return
      }
      // Scroll only the menu; opening a select must not move the document.
      if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop
      else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) {
        menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight
      }
    }
    const afterExpansion = (event: TransitionEvent) => {
      if (event.propertyName === 'grid-template-rows') revealActive()
    }
    revealActive()
    menu.addEventListener('transitionend', afterExpansion)
    return () => menu.removeEventListener('transitionend', afterExpansion)
  }, [active, expanded, id, openGroup])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab' || event.key === 'Escape') {
      setOpen(false)
      if (event.key === 'Escape' && expanded) event.preventDefault()
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const items = !expanded ? roots : enabled
      const index = items.findIndex((option) => option.key === active)
      const next =
        event.key === 'Home'
          ? items[0]
          : event.key === 'End'
            ? items.at(-1)
            : items[
                Math.max(
                  0,
                  Math.min(items.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                )
              ]
      if (!expanded) showMenu(event.key === 'Home' || event.key === 'End' ? next?.key : undefined)
      else if (next) setActive(next.key)
      return
    }
    if (expanded && ['ArrowRight', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault()
      const group = groups.find((item) => item.key === active)
      if (group) {
        if (event.key === 'ArrowLeft') setOpenGroup(null)
        else if (openGroup !== group.key) setOpenGroup(group.key)
        else {
          const first = optionNodes(group.options)[0]
          if (first) setActive(first.key)
        }
      } else if (event.key === 'ArrowLeft') {
        const parent = groups.find((item) =>
          item.options.some((option) => `option-${option.value}` === active),
        )
        if (parent) setActive(parent.key)
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (expanded) activate()
      else showMenu()
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const text =
        (expanded && Date.now() - search.current.time < 700 ? search.current.text : '') + event.key
      search.current = { text, time: Date.now() }
      const match = (!expanded ? roots : enabled).find((option) =>
        option.label.toLocaleLowerCase().startsWith(text.toLocaleLowerCase()),
      )
      if (match) {
        if (expanded) setActive(match.key)
        else showMenu(match.key)
      }
    }
  }

  function renderOption(option: SelectOption) {
    return (
      <div
        key={option.value}
        aria-disabled={option.disabled || undefined}
        aria-selected={value === option.value}
        className="select-option"
        data-active={active === `option-${option.value}` || undefined}
        id={`${id}-option-${option.value}`}
        onClick={() => !option.disabled && choose(option.value)}
        onMouseDown={(event) => event.preventDefault()}
        role="treeitem"
      >
        <span>{option.label}</span>
        {value === option.value ? <Check aria-hidden="true" size={16} /> : null}
      </div>
    )
  }

  return (
    <>
      <button
        aria-activedescendant={expanded ? `${id}-${active}` : undefined}
        aria-controls={expanded ? `${id}-options` : undefined}
        aria-describedby={describedBy}
        aria-expanded={expanded}
        aria-haspopup="tree"
        aria-label={label}
        className="select-trigger instrument-product-trigger"
        disabled={disabled}
        id={id}
        onBlur={() => setOpen(false)}
        onClick={() => (expanded ? setOpen(false) : showMenu())}
        onKeyDown={handleKeyDown}
        ref={trigger}
        role="combobox"
        type="button"
        value={value}
      >
        <span>
          {selected?.group ? (
            <span className="instrument-product-selection">{selected.group}</span>
          ) : null}
          {selected?.label ?? 'Seleccione una opción'}
        </span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {expanded &&
        createPortal(
          <div
            aria-label={label}
            className="select-menu instrument-product-menu"
            id={`${id}-options`}
            ref={list}
            role="tree"
            style={position}
          >
            {groups.map((group) => (
              <div
                key={group.key}
                id={`${id}-${group.key}`}
                role="treeitem"
                aria-label={group.label}
                aria-expanded={openGroup === group.key}
                onClick={(event) => {
                  if (
                    (event.target as HTMLElement).closest('[role="treeitem"]') ===
                    event.currentTarget
                  )
                    toggleGroup(group.key)
                }}
                onMouseDown={(event) => event.preventDefault()}
              >
                <div
                  className="select-option instrument-product-heading"
                  data-active={active === group.key || undefined}
                >
                  <span>{group.label}</span>
                  <ChevronDown aria-hidden="true" size={18} />
                </div>
                <div
                  className="instrument-product-options"
                  aria-hidden={openGroup !== group.key}
                  inert={openGroup !== group.key}
                >
                  <div role="group" aria-label={`Productos de ${group.label}`}>
                    {group.options.map(renderOption)}
                  </div>
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
