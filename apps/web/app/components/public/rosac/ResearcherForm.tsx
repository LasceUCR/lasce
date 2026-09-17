'use client'

import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import type { TeamMember } from '@/app/lib/rosac'

export interface ResearcherFormValues {
  role: string
  name: string
  institution: string
  description: string
  /** `null` when the photo was not touched or was explicitly removed — see `photoRemoved`. */
  photoFile: File | null
  /** True once the existing photo was removed without picking a replacement. */
  photoRemoved: boolean
}

export interface ResearcherFormProps {
  /** The researcher's current values — the form starts pre-filled with these. */
  researcher: TeamMember
  onSave: (values: ResearcherFormValues) => void
  onCancel: () => void
  /** Overrides the confirmation dialog's copy — a new researcher reads oddly as "save changes". */
  confirmTitle?: string
  confirmMessage?: string
}

/**
 * Creates or edits one ROSAC researcher profile (photo, role, name,
 * institution, description) — `researcher` starts blank for a new profile,
 * or pre-filled for an existing one. Saving asks for confirmation first,
 * same as `EditableWrapper`'s delete action and `NosotrosActivityForm`.
 *
 * The photo is kept as a local `File` only — there is no upload endpoint yet
 * (`apps/web/app/services/storage` is unfinished, see
 * `docs/manage-assets.md#known-gaps`), so `onSave` receives the raw file and
 * decides what to do with it once that exists.
 */
export function ResearcherForm({
  researcher,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en este investigador?',
}: ResearcherFormProps) {
  const [role, setRole] = useState(researcher.role)
  const [name, setName] = useState(researcher.name)
  const [institution, setInstitution] = useState(researcher.institution)
  const [description, setDescription] = useState(researcher.description)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const hasPhoto = photoFile !== null || (Boolean(researcher.src) && !photoRemoved)
  const canSave =
    role.trim() !== '' &&
    name.trim() !== '' &&
    institution.trim() !== '' &&
    description.trim() !== '' &&
    hasPhoto

  return (
    <div className="cms-form">
      <FileDropInput
        existingImageUrl={researcher.src}
        helperText="Retrato del investigador, en formato JPG o PNG."
        label="Foto"
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
      />

      <FormField id="researcher-role" label="Rol" onChange={setRole} required value={role} />

      <FormField id="researcher-name" label="Nombre" onChange={setName} required value={name} />

      <FormField
        id="researcher-institution"
        label="Institución"
        onChange={setInstitution}
        required
        value={institution}
      />

      <FormField
        id="researcher-description"
        label="Descripción"
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
          onSave({ role, name, institution, description, photoFile, photoRemoved })
        }}
        open={confirmOpen}
        title={confirmTitle}
      />
    </div>
  )
}
