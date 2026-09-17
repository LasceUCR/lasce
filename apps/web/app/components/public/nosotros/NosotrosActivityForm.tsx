'use client'

import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import type { NosotrosCardIcon } from '@/app/lib/nosotros'

const iconOptions: FormFieldOption[] = [
  { value: 'sun', label: 'Sol' },
  { value: 'waves', label: 'Ondas' },
  { value: 'satellite', label: 'Satélite' },
  { value: 'code', label: 'Código' },
  { value: 'collaboration', label: 'Colaboración' },
  { value: 'education', label: 'Educación' },
]

export interface NosotrosActivityFormValues {
  icon: NosotrosCardIcon
  title: string
  description: string
}

export interface NosotrosActivityFormProps {
  /** The activity's current values — the form starts pre-filled with these. */
  activity: NosotrosActivityFormValues
  onSave: (values: NosotrosActivityFormValues) => void
  onCancel: () => void
  /** Overrides the confirmation dialog's copy — a new card reads oddly as "save the changes". */
  confirmTitle?: string
  confirmMessage?: string
}

/**
 * Creates or edits one Nosotros activity flashcard (icon, title, text) —
 * `activity` starts blank for a new card, or pre-filled for an existing one.
 * Saving asks for confirmation first, same as `EditableWrapper`'s delete
 * action, since there is no undo yet.
 */
export function NosotrosActivityForm({
  activity,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en esta actividad?',
}: NosotrosActivityFormProps) {
  const [icon, setIcon] = useState<NosotrosCardIcon>(activity.icon)
  const [title, setTitle] = useState(activity.title)
  const [description, setDescription] = useState(activity.description)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canSave = title.trim() !== '' && description.trim() !== ''

  return (
    <div className="cms-form">
      <FormField
        id="nosotros-activity-icon"
        label="Ícono"
        onChange={(value) => setIcon(value as NosotrosCardIcon)}
        options={iconOptions}
        value={icon}
      />

      <FormField
        id="nosotros-activity-title"
        label="Título"
        onChange={setTitle}
        required
        value={title}
      />

      <FormField
        id="nosotros-activity-description"
        label="Texto"
        multiline
        onChange={setDescription}
        required
        value={description}
      />

      <div className="cms-form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={!canSave} onClick={() => setConfirmOpen(true)} variant="primary">
          Confirmar
        </Button>
      </div>

      <ConfirmDialog
        message={confirmMessage}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          onSave({ icon, title, description })
        }}
        open={confirmOpen}
        title={confirmTitle}
      />
    </div>
  )
}
