'use client'

import type { UniqueIdentifier } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { IconButton } from '@/app/components/public/IconButton'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'

interface EditableWrapperBaseProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  deleteConfirmTitle?: string
  deleteConfirmMessage?: string
  /** The delete confirmation's buttons, in the page's language. */
  deleteConfirmLabel?: string
  deleteCancelLabel?: string
  className?: string
}

/** Without `drag`, the wrapper only edits and deletes. */
interface StaticProps {
  drag?: false
}

/**
 * With `drag`, the wrapper is also one item of the `SortableContext` around it, moved by a handle
 * beside its other actions. The parent owns the `DndContext` (sensors, announcements) and saves
 * the new order in its `onDragEnd`.
 */
interface DraggableProps {
  drag: true
  /** The item's id in the parent's `SortableContext` `items`. */
  dragId: UniqueIdentifier
  /** The handle's accessible name, e.g. "Reordenar Índice Kp". */
  dragLabel?: string
  /** How assistive technology describes the handle, in the page's language: `'reordenable'`. */
  dragRoleDescription?: string
  /**
   * The database column that stores this list's order, such as `'position'`. Its `onDragEnd`
   * reads it from the dragged item (`active.data.current.positionField`) to say where the new
   * order is saved, and the server checks it against the columns that table really has.
   */
  positionField: string
  /**
   * The item as loaded from its table. The handle only shows when it holds `positionField` as a
   * number: most dynamic content has no position column yet, and an item without one is shown
   * with its other actions only, not draggable.
   */
  record: object
}

export type EditableWrapperProps = EditableWrapperBaseProps & (StaticProps | DraggableProps)

/** True when `record` holds `field` as a number: its table has that position column. */
function hasPositionField(record: object, field: string): boolean {
  return typeof (record as Record<string, unknown>)[field] === 'number'
}

/** What a dragged wrapper tells the list's `onDragEnd`, as `active.data.current`. */
export interface EditableDragData {
  positionField: string
}

interface SortableFrameProps {
  id: UniqueIdentifier
  positionField: string
  label: string
  roleDescription: string
  className: string
  /** Renders the wrapper's content, given the drag handle to show among its actions. */
  children: (handle: ReactNode) => ReactNode
}

/** The wrapper's frame as a sortable item: `useSortable` only runs when dragging is enabled. */
function SortableFrame({
  id,
  positionField,
  label,
  roleDescription,
  className,
  children,
}: SortableFrameProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    attributes: { roleDescription },
    data: { positionField } satisfies EditableDragData,
  })

  const handle = (
    <button
      {...attributes}
      {...listeners}
      aria-label={label}
      className="icon-button editable-drag-handle"
      ref={setActivatorNodeRef}
      type="button"
    >
      <GripVertical aria-hidden="true" size={16} strokeWidth={1.8} />
    </button>
  )

  return (
    <div
      className={[className, isDragging && 'editable-dragging'].filter(Boolean).join(' ')}
      data-position-field={positionField}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children(handle)}
    </div>
  )
}

/**
 * Wraps a piece of content with the edit/delete affordances the "Modo
 * edición" toggle reveals. Content-agnostic: it doesn't know what `children`
 * is, only how to offer editing it (`onEdit`) or removing it (`onDelete`,
 * gated behind a confirmation dialog since deleting is not undoable yet).
 *
 * `drag` adds a handle to reorder it among its siblings, with a pointer, a
 * finger or the keyboard (Space or Enter to pick up, arrows to move, Space or
 * Enter to drop), when its `record` has the `positionField` the order is
 * stored in. It needs a `DndContext` and a `SortableContext` around the list;
 * see docs/add-a-cms-feature.md.
 */
export function EditableWrapper(props: EditableWrapperProps) {
  const {
    children,
    onEdit,
    onDelete,
    editLabel = 'Editar',
    deleteLabel = 'Eliminar',
    deleteConfirmTitle = 'Eliminar elemento',
    deleteConfirmMessage = '¿Desea eliminar este elemento? Esta acción no se puede deshacer.',
    deleteConfirmLabel = 'Confirmar',
    deleteCancelLabel = 'Cancelar',
    className,
  } = props
  const [confirmOpen, setConfirmOpen] = useState(false)

  const classes = ['editable', className].filter(Boolean).join(' ')

  function content(handle: ReactNode) {
    return (
      <>
        {children}

        <div className="editable-actions">
          {handle}
          {onEdit ? (
            <IconButton
              icon={<Pencil size={16} strokeWidth={1.8} />}
              label={editLabel}
              onClick={onEdit}
            />
          ) : null}
          {onDelete ? (
            <IconButton
              icon={<Trash2 size={16} strokeWidth={1.8} />}
              label={deleteLabel}
              onClick={() => setConfirmOpen(true)}
              variant="danger"
            />
          ) : null}
        </div>

        {onDelete ? (
          <StandardConfirmDialog
            cancelLabel={deleteCancelLabel}
            confirmLabel={deleteConfirmLabel}
            message={deleteConfirmMessage}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false)
              onDelete()
            }}
            open={confirmOpen}
            severity="danger"
            title={deleteConfirmTitle}
          />
        ) : null}
      </>
    )
  }

  if (props.drag && hasPositionField(props.record, props.positionField)) {
    return (
      <SortableFrame
        className={classes}
        id={props.dragId}
        label={props.dragLabel ?? 'Reordenar'}
        positionField={props.positionField}
        roleDescription={props.dragRoleDescription ?? 'reordenable'}
      >
        {content}
      </SortableFrame>
    )
  }

  return <div className={classes}>{content(null)}</div>
}
