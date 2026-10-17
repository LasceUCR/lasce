'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper, type EditableDragData } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  buildIndicatorRequest,
  indicatorInitial,
  jsonRequest,
  moveIndicator,
  type IndicatorDraft,
  type IndicatorFormInitial,
} from '@/app/lib/home-form'
import type {
  GeomagneticIndicatorData,
  IndicatorPositionField,
  IndicatorReviewConfirmation,
  IndicatorTone,
} from '@/app/lib/home-schema'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'

import { IndicatorCard } from './IndicatorCard'
import { IndicatorForm, type IndicatorFormHandle } from './IndicatorForm'

/** One index as the section shows it: its data plus its name and accent from the catalogue. */
export interface IndicatorItem extends Omit<GeomagneticIndicatorData, 'code' | 'position'> {
  label: string
  tone: IndicatorTone
  /** Absent for the catalogue's fallback indices, which are not stored and so cannot be moved. */
  position?: number
}

export interface GeomagneticIndicatorsProps {
  title: string
  /** Shown beside the title while the values are entered by hand. */
  demoNotice: string
  indicators: IndicatorItem[]
  canEdit?: boolean
}

interface Editing {
  indicator: IndicatorItem
  /** Taken when the editor opened, so a refresh behind it cannot change what it saves against. */
  initial: IndicatorFormInitial
}

/** Where `geomagnetic_indices` keeps its display order. */
const POSITION_FIELD: IndicatorPositionField = 'position'

function sameOrder(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * The home page's geomagnetic indices. With edit mode on, for someone who can edit, each card
 * can be edited (its value and its description in both languages) and dragged to another
 * position, with a pointer, a finger or the keyboard. A drop saves the new order at once and
 * reports it in a toast; if the save fails, the cards go back to where they were. Indices are
 * never added or removed here.
 */
export function GeomagneticIndicators({
  title,
  demoNotice,
  indicators,
  canEdit = false,
}: GeomagneticIndicatorsProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const t = useTranslations('home')
  const sendWithFeedback = useRequestFeedback()
  const dndId = useId()
  const form = useRef<IndicatorFormHandle>(null)
  // One request at a time: a second save while the first is in flight would send the same version
  // again and come back as a false conflict, and a second drop would race the first order.
  const saving = useRef(false)

  // The order on screen, which a drop changes before the server has answered. It follows the
  // indices passed in whenever they change (after a refresh), adjusted while rendering.
  const [source, setSource] = useState(indicators)
  const [order, setOrder] = useState(() => indicators.map((indicator) => indicator.id))
  if (indicators !== source) {
    setSource(indicators)
    setOrder(indicators.map((indicator) => indicator.id))
  }

  const [editing, setEditing] = useState<Editing | null>(null)

  const sensors = useSensors(
    // A short movement first, so a click on the handle or on the card's edit button stays a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]))
  const sorted = order
    .map((id) => byId.get(id))
    .filter((indicator): indicator is IndicatorItem => indicator !== undefined)

  function labelOf(id: UniqueIdentifier | undefined) {
    return id === undefined ? '' : (byId.get(String(id))?.label ?? '')
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => t('editor.reorderPicked', { label: labelOf(active.id) }),
    // Nothing to say while the card is still over its own place.
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id
        ? t('editor.reorderOver', { label: labelOf(active.id), target: labelOf(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over && over.id !== active.id
        ? t('editor.reorderDropped', { label: labelOf(active.id), target: labelOf(over.id) })
        : t('editor.reorderDroppedInPlace', { label: labelOf(active.id) }),
    onDragCancel: ({ active }) => t('editor.reorderCancelled', { label: labelOf(active.id) }),
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    const previous = order
    const next = moveIndicator(previous, String(active.id), over ? String(over.id) : null)
    if (sameOrder(previous, next)) return

    if (saving.current) return
    saving.current = true
    setOrder(next)
    // The column the dragged card says holds the order; the server only accepts the real ones.
    const { positionField } = active.data.current as EditableDragData
    const saved = await sendWithFeedback(
      '/api/home/indicators',
      jsonRequest('PUT', { ids: next, positionField }),
      {
        success: t('editor.orderUpdated'),
        fallback: t('saveErrors.orderFailed'),
        onSuccess: () => router.refresh(),
      },
    )
    saving.current = false
    // Back to where the cards were: nothing was saved.
    if (!saved) setOrder(previous)
  }

  function closeEditor() {
    setEditing(null)
  }

  async function handleSave(draft: IndicatorDraft, confirmed: IndicatorReviewConfirmation[]) {
    if (!editing) return
    const body = buildIndicatorRequest(editing.initial, draft, confirmed)
    if (!body) {
      closeEditor()
      return
    }

    if (saving.current) return
    saving.current = true
    await sendWithFeedback(
      `/api/home/indicators/${editing.indicator.id}`,
      jsonRequest('PATCH', body),
      {
        success: t('editor.indicatorUpdated'),
        fallback: t('saveErrors.indicatorFailed'),
        onSuccess: () => {
          closeEditor()
          router.refresh()
        },
      },
    )
    saving.current = false
  }

  function card(indicator: IndicatorItem) {
    return (
      <IndicatorCard
        description={indicator.description}
        descriptionLang={contentLangAttribute(indicator.contentLocale)}
        label={indicator.label}
        tone={indicator.tone}
        value={indicator.value}
      />
    )
  }

  const editable = editMode && canEdit && sorted.every((indicator) => indicator.editing)

  const modal = editing ? (
    <Modal
      onClose={() => {
        if (form.current) form.current.requestCancel()
        else closeEditor()
      }}
      open
      title={t('editor.indicatorEditTitle', { label: editing.indicator.label })}
    >
      <IndicatorForm
        initial={editing.initial}
        onCancel={closeEditor}
        onSave={handleSave}
        ref={form}
      />
    </Modal>
  ) : null

  return (
    <section className="indicators page-width" id="datos" aria-labelledby="indicators-title">
      <div className="indicator-heading">
        <h2 id="indicators-title">{title}</h2>
        <span>{demoNotice}</span>
      </div>

      {editable ? (
        <DndContext
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: t('editor.reorderInstructions') },
          }}
          collisionDetection={closestCenter}
          id={dndId}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="indicator-grid indicator-grid-editable">
              {sorted.map((indicator) => (
                <EditableWrapper
                  drag
                  dragId={indicator.id}
                  positionField={POSITION_FIELD}
                  record={indicator}
                  dragLabel={t('editor.reorderHandle', { label: indicator.label })}
                  dragRoleDescription={t('editor.reorderRole')}
                  editLabel={t('editor.indicatorEditLabel', { label: indicator.label })}
                  key={indicator.id}
                  onEdit={() => {
                    const { editing: data } = indicator
                    if (data) setEditing({ indicator, initial: indicatorInitial(data) })
                  }}
                >
                  {card(indicator)}
                </EditableWrapper>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="indicator-grid">
          {sorted.map((indicator) => (
            <IndicatorCard
              description={indicator.description}
              descriptionLang={contentLangAttribute(indicator.contentLocale)}
              key={indicator.id}
              label={indicator.label}
              tone={indicator.tone}
              value={indicator.value}
            />
          ))}
        </div>
      )}

      {/* Outside the section, whose `h2` style would otherwise reach the dialog's title. */}
      {modal ? createPortal(modal, document.body) : null}
    </section>
  )
}
