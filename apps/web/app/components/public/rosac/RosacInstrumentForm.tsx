import { useId, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { uploadInstrumentImage } from '@/app/(public)/radioastronomia/actions'
import { rosacInstruments } from '@/app/lib/scientific-data'
import type { RosacInstrumentCardContent } from '@/app/lib/rosac-instruments'

export type ConsultationMode = 'simulation' | 'custom' | 'disabled'

export const CONSULTATION_MODE_OPTIONS: FormFieldOption[] = [
  { value: 'simulation', label: 'Simulación del catálogo de datos (ROSAC)' },
  { value: 'custom', label: 'Enlace externo o personalizado' },
  { value: 'disabled', label: 'En integración / Próximamente (sin enlace)' },
]

export const SIMULATION_TARGET_OPTIONS: FormFieldOption[] = rosacInstruments.map((inst, index) => {
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
  const t = useTranslations('rosac.editor')
  const tRosacProducts = useTranslations('rosac.instruments.products')
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

  const consultationModeOptions: FormFieldOption[] = useMemo(
    () => [
      { value: 'simulation', label: t('instruments.modes.simulation') },
      { value: 'custom', label: t('instruments.modes.custom') },
      { value: 'disabled', label: t('instruments.modes.disabled') },
    ],
    [t],
  )

  const simulationTargetOptions: FormFieldOption[] = useMemo(() => {
    function getLocalizedProductName(code: string, fallback?: string): string | undefined {
      if (code === 'ROSAC-I1') return tRosacProducts('timeSeries')
      if (code === 'ROSAC-I2') return tRosacProducts('dynamicSpectrum')
      return fallback
    }

    return rosacInstruments.map((inst, index) => {
      const productName = getLocalizedProductName(inst.code, inst.products[0]?.name)
      return {
        value: inst.code,
        label: t('instruments.simulationTargetOption', {
          index: index + 1,
          product: productName ? ` - ${productName}` : '',
          code: inst.code,
        }),
      }
    })
  }, [t, tRosacProducts])

  const nameError = hasAttemptedSubmit && name.trim() === '' ? t('instruments.nameRequired') : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? t('instruments.descriptionRequired') : null
  const hasImage = imageFile !== null || (Boolean(imageSrc) && !imageRemoved)
  const imageError = hasAttemptedSubmit && !hasImage ? t('instruments.imageRequired') : null
  const customHrefError =
    hasAttemptedSubmit && consultationMode === 'custom' && customHref.trim() === ''
      ? t('instruments.customHrefRequired')
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
        setUploadError(t('instruments.uploadError'))
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
        alt:
          imageAlt.trim() ||
          t('instruments.imageAltDefault', {
            name: name.trim(),
          }),
      },
      consultation: {
        label:
          consultationLabel.trim() ||
          t('instruments.consultationLabelPlaceholder', {
            name: name.trim(),
          }),
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
        label={t('instruments.nameLabel')}
        onChange={setName}
        required
        value={name}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label={t('instruments.descriptionLabel')}
        multiline
        onChange={setDescription}
        required
        value={description}
      />

      <FileDropInput
        errorMessage={imageError}
        existingImageUrl={!imageRemoved && imageSrc ? imageSrc : undefined}
        helperText={t('instruments.imageHelp')}
        label={t('instruments.imageLabel')}
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
        label={t('instruments.imageAltLabel')}
        onChange={setImageAlt}
        placeholder={t('instruments.imageAltPlaceholder')}
        value={imageAlt}
      />

      <div className="cms-form-field">
        <span className="cms-form-field-label">{t('instruments.actionSectionLabel')}</span>

        <FormField
          id={`${formId}-consultation-mode`}
          label={t('instruments.actionTypeLabel')}
          onChange={(val) => setConsultationMode(val as ConsultationMode)}
          options={consultationModeOptions}
          value={consultationMode}
        />

        {consultationMode === 'simulation' ? (
          <>
            <FormField
              id={`${formId}-simulation-target`}
              label={t('instruments.simulationTargetLabel')}
              onChange={setSimulationTarget}
              options={simulationTargetOptions}
              value={simulationTarget}
            />
            <p className="form-field-hint" style={{ marginTop: '-14px', marginBottom: '8px' }}>
              {t('instruments.simulationAutoUrl')}{' '}
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
            label={t('instruments.customHrefLabel')}
            onChange={setCustomHref}
            placeholder={t('instruments.customHrefPlaceholder')}
            required
            type="url"
            value={customHref}
          />
        ) : null}

        {consultationMode === 'disabled' ? (
          <p className="form-field-hint" style={{ marginTop: '-14px', marginBottom: '8px' }}>
            {t('instruments.disabledHint')}
          </p>
        ) : null}

        <FormField
          id={`${formId}-consultation-label`}
          label={t('instruments.consultationLabel')}
          onChange={setConsultationLabel}
          placeholder={
            name.trim()
              ? t('instruments.consultationLabelPlaceholder', { name: name.trim() })
              : t('instruments.consultationLabelDefault')
          }
          value={consultationLabel}
        />
      </div>

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('instruments.cancel')}
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? t('instruments.saving') : t('instruments.save')}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('discardDialog.message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onCancel()
        }}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discardDialog.title')}
      />
    </div>
  )
}
