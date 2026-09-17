'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FormField } from '@/app/components/public/FormField'

export interface ResearchAreaFormValues {
  title: string
  description: string
  src: string
}

export interface ResearchAreaFormProps {
  /** The area's current values — the form starts pre-filled with these. */
  area: ResearchAreaFormValues
  onSave: (values: ResearchAreaFormValues) => void
  onCancel: () => void
  confirmTitle?: string
  confirmMessage?: string
}

export function ResearchAreaForm({
  area,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en esta área de investigación?',
}: ResearchAreaFormProps) {
  const [title, setTitle] = useState(area.title)
  const [description, setDescription] = useState(area.description)
  const [src, setSrc] = useState(area.src)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const formId = useId()

  const canSave = title.trim() !== '' && description.trim() !== ''

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    setImageFile(file)
  }

  function handleConfirmSave() {
    let imageSrc = src

    if (imageFile) {
      imageSrc = URL.createObjectURL(imageFile)
    }

    setConfirmOpen(false)

    onSave({
      title,
      description,
      src: imageSrc,
    })
  }

  return (
    <div className="research-area-form">
      <FormField id={`${formId}-title`} label="Título" onChange={setTitle} required value={title} />

      <FormField
        id={`${formId}-description`}
        label="Descripción"
        multiline
        onChange={setDescription}
        required
        value={description}
      />

      <div className="form-field">
        <label htmlFor={`${formId}-image`}>Imagen</label>

        <input accept="image/*" id={`${formId}-image`} onChange={handleImageChange} type="file" />

        {imageFile && <p className="form-field-help">Imagen seleccionada: {imageFile.name}</p>}

        {!imageFile && src && (
          <p className="form-field-help">La imagen actual se conservará si no selecciona otra.</p>
        )}
      </div>

      <div className="nosotros-activity-form-actions">
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
        onConfirm={handleConfirmSave}
        open={confirmOpen}
        title={confirmTitle}
      />
    </div>
  )
}
