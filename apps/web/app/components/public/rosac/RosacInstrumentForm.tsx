'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { uploadInstrumentImage } from '@/app/(public)/radioastronomia/actions'
import { rosacInstruments } from '@/app/lib/scientific-data'
import type { RosacInstrumentCardContent } from '@/app/lib/rosac-instruments'

export type ConsultationMode = 'simulation' | 'custom' | 'disabled'

const CONSULTATION_MODE_OPTIONS: FormFieldOption[] = [
  { value: 'simulation', label: 'Simulación del catálogo de datos (ROSAC)' },
  { value: 'custom', label: 'Enlace externo o personalizado' },
  { value: 'disabled', label: 'En integración / Próximamente (sin enlace)' },
]

const SIMULATION_TARGET_OPTIONS: FormFieldOption[] = rosacInstruments.map((inst, index) => {
  const productName = inst.products[0]?.name
  return {
    value: inst.code,
    label: `Instrumento ${index + 1}${productName ? ` - ${productName}` : ''} (${inst.code})`,
  }
})

export function getSimulationUrl(instrumentCode: string): string {
  return `/datos?source=ROSAC&instrument=${instrumentCode}#scientific-query-title`
}

function getInitialConsultationState(instrument: RosacInstrumentCardContent | null): {
  mode: ConsultationMode
  target: string
  customHref: string
} {
  const defaultTarget = rosacInstruments[0]?.code ?? 'ROSAC-I1'

  if (!instrument) {
    return {
      mode: 'simulation',
      target: defaultTarget,
      customHref: '',
    }
  }

  const href = instrument.consultation?.href?.trim()
  if (!href) {
    return {
      mode: 'disabled',
      target: defaultTarget,
      customHref: '',
    }
  }

  if (href.startsWith('/datos?source=ROSAC')) {
    const match = href.match(/instrument=([^&#]+)/)
    const code = match?.[1]
    if (code === 'ROSAC-I1' || code === 'inst-1') {
      return { mode: 'simulation', target: 'ROSAC-I1', customHref: '' }
    }
    if (code === 'ROSAC-I2' || code === 'inst-2') {
      return { mode: 'simulation', target: 'ROSAC-I2', customHref: '' }
    }
    const validCodes = rosacInstruments.map((i) => i.code)
    if (code && (validCodes as readonly string[]).includes(code)) {
      return { mode: 'simulation', target: code, customHref: '' }
    }
  }

  return {
    mode: 'custom',
    target: defaultTarget,
    customHref: href,
  }
}

export interface RosacInstrumentFormValues {
  name: string
  pendingMessage?: string
  image?: { src: string; alt: string }
  consultation?: { href?: string; label: string; notice?: string }
}

export interface RosacInstrumentFormProps {
  /** Existing instrument for editing, or null for creating a new card. */
  instrument: RosacInstrumentCardContent | null
  onSave: (values: RosacInstrumentFormValues) => void
  onCancel: () => void
}

export const DEFAULT_INSTRUMENT_IMAGE = {
  src: '/images/ROSAC/construction/Fotogrametria/Fotogrametria_1.jpg',
  alt: 'Imagen ilustrativa del instrumento ROSAC',
}

export function RosacInstrumentForm({ instrument, onSave, onCancel }: RosacInstrumentFormProps) {
  const initialDescription = instrument?.consultation?.notice ?? instrument?.pendingMessage ?? ''
  const initialConsultation = getInitialConsultationState(instrument)

  const [name, setName] = useState(instrument?.name ?? '')
  const [description, setDescription] = useState(initialDescription)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const imageSrc = instrument?.image?.src ?? ''
  const [imageAlt, setImageAlt] = useState(instrument?.image?.alt ?? '')

  const [consultationMode, setConsultationMode] = useState<ConsultationMode>(
    initialConsultation.mode,
  )
  const [simulationTarget, setSimulationTarget] = useState(initialConsultation.target)
  const [customHref, setCustomHref] = useState(initialConsultation.customHref)
  const [consultationLabel, setConsultationLabel] = useState(instrument?.consultation?.label ?? '')

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const formId = useId()

  const nameError = hasAttemptedSubmit && name.trim() === '' ? 'El nombre es obligatorio.' : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? 'La descripción es obligatoria.' : null
  const hasImage = imageFile !== null || (Boolean(imageSrc) && !imageRemoved)
  const imageError = hasAttemptedSubmit && !hasImage ? 'La imagen es obligatoria.' : null
  const customHrefError =
    hasAttemptedSubmit && consultationMode === 'custom' && customHref.trim() === ''
      ? 'El enlace es obligatorio para un destino personalizado.'
      : null

  const isCustomHrefValid = consultationMode !== 'custom' || customHref.trim() !== ''
  const isFormValid =
    name.trim() !== '' && description.trim() !== '' && hasImage && isCustomHrefValid

  const isConsultationDirty =
    consultationLabel !== (instrument?.consultation?.label ?? '') ||
    consultationMode !== initialConsultation.mode ||
    (consultationMode === 'simulation' && simulationTarget !== initialConsultation.target) ||
    (consultationMode === 'custom' && customHref !== initialConsultation.customHref)

  const isDirty =
    name !== (instrument?.name ?? '') ||
    description !== initialDescription ||
    imageFile !== null ||
    imageRemoved ||
    imageAlt !== (instrument?.image?.alt ?? '') ||
    isConsultationDirty

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  async function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    if (!isFormValid) {
      if (name.trim() === '') {
        document.getElementById(`${formId}-name`)?.focus()
      } else if (description.trim() === '') {
        document.getElementById(`${formId}-description`)?.focus()
      } else if (consultationMode === 'custom' && customHref.trim() === '') {
        document.getElementById(`${formId}-consultation-href`)?.focus()
      }
      return
    }

    if (isUploading) return

    let finalImageUrl = imageRemoved ? '' : imageSrc
    if (imageFile) {
      setIsUploading(true)
      setUploadError(null)
      try {
        const formData = new FormData()
        formData.set('file', imageFile)
        const result = await uploadInstrumentImage(formData)
        if (!result.ok) {
          setIsUploading(false)
          setUploadError(result.error)
          return
        }
        finalImageUrl = result.imageUrl
      } catch {
        setIsUploading(false)
        setUploadError('No se pudo subir la imagen. Inténtelo de nuevo.')
        return
      }
      setIsUploading(false)
    }

    let finalConsultationHref: string | undefined = undefined
    if (consultationMode === 'simulation') {
      finalConsultationHref = getSimulationUrl(simulationTarget)
    } else if (consultationMode === 'custom') {
      finalConsultationHref = customHref.trim() || undefined
    } else {
      finalConsultationHref = undefined
    }

    const values: RosacInstrumentFormValues = {
      name: name.trim(),
      image: {
        src: finalImageUrl,
        alt: imageAlt.trim() || `Imagen ilustrativa de ${name.trim()}`,
      },
      consultation: {
        label: consultationLabel.trim() || `Consultar simulación de ${name.trim()}`,
        href: finalConsultationHref,
        notice: description.trim(),
      },
    }

    onSave(values)
  }

  return (
    <div className="cms-form">
      {uploadError ? (
        <p className="form-alert" role="alert">
          {uploadError}
        </p>
      ) : null}

      <FormField
        errorMessage={nameError}
        id={`${formId}-name`}
        label="Nombre del instrumento"
        onChange={setName}
        required
        value={name}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label="Descripción"
        multiline
        onChange={setDescription}
        required
        value={description}
      />

      <FileDropInput
        errorMessage={imageError}
        existingImageUrl={!imageRemoved && imageSrc ? imageSrc : undefined}
        helperText="Formatos JPG, PNG, WebP o AVIF (máx. 10 MB)."
        label="Imagen del instrumento"
        onFileSelect={(file) => {
          setImageFile(file)
          if (!file) {
            setImageRemoved(true)
          } else {
            setImageRemoved(false)
          }
        }}
        required
      />

      <FormField
        id={`${formId}-image-alt`}
        label="Texto alternativo de la imagen (Accesibilidad)"
        onChange={setImageAlt}
        placeholder="Descripción breve de la imagen para lectores de pantalla"
        value={imageAlt}
      />

      <div className="cms-form-field">
        <span className="cms-form-field-label">Acción de consulta científica</span>

        <FormField
          id={`${formId}-consultation-mode`}
          label="Tipo de acción"
          onChange={(val) => setConsultationMode(val as ConsultationMode)}
          options={CONSULTATION_MODE_OPTIONS}
          value={consultationMode}
        />

        {consultationMode === 'simulation' ? (
          <>
            <FormField
              id={`${formId}-simulation-target`}
              label="Instrumento de simulación asociado"
              onChange={setSimulationTarget}
              options={SIMULATION_TARGET_OPTIONS}
              value={simulationTarget}
            />
            <p className="form-field-hint" style={{ marginTop: '-14px', marginBottom: '8px' }}>
              Enlace automático:{' '}
              <code style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                {getSimulationUrl(simulationTarget)}
              </code>
            </p>
          </>
        ) : null}

        {consultationMode === 'custom' ? (
          <FormField
            errorMessage={customHrefError}
            id={`${formId}-consultation-href`}
            label="Enlace de consulta (URL)"
            onChange={setCustomHref}
            placeholder="https://... o /datos/..."
            required
            type="url"
            value={customHref}
          />
        ) : null}

        {consultationMode === 'disabled' ? (
          <p className="form-field-hint" style={{ marginTop: '-14px', marginBottom: '8px' }}>
            El botón se mostrará deshabilitado indicando que la simulación está pendiente o en
            integración.
          </p>
        ) : null}

        <FormField
          id={`${formId}-consultation-label`}
          label="Etiqueta del botón"
          onChange={setConsultationLabel}
          placeholder={
            name.trim() ? `Consultar simulación de ${name.trim()}` : 'Consultar simulación'
          }
          value={consultationLabel}
        />
      </div>

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? 'Guardando...' : 'Confirmar'}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados."
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onCancel()
        }}
        open={confirmDiscardOpen}
        severity="warning"
        title="Descartar cambios no guardados"
      />
    </div>
  )
}
