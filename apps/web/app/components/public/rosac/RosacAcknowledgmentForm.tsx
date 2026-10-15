'use client'

import Image from 'next/image'
import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { uploadAcknowledgmentLogo } from '@/app/(public)/radioastronomia/actions'
import type { RosacAcknowledgment } from '@/app/lib/rosac'

export interface RosacAcknowledgmentFormValues {
  name: string
  logo: {
    src: string
    alt: string
  }
}

export interface RosacAcknowledgmentFormProps {
  /** Existing institution acknowledgment or null when creating a new one. */
  institution: RosacAcknowledgment | null
  onSave: (values: RosacAcknowledgmentFormValues) => void
  onCancel: () => void
}

export const PREDEFINED_ACKNOWLEDGMENT_LOGOS = [
  {
    label: 'Vicerrectoría de Investigación, UCR',
    src: '/images/ROSAC/acknowledgments/vicerrectoria-investigacion.webp',
    defaultAlt: 'Logo de la Vicerrectoría de Investigación de la Universidad de Costa Rica',
  },
  {
    label: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    src: '/images/ROSAC/acknowledgments/cinespa.webp',
    defaultAlt: 'Logo del Centro de Investigaciones Espaciales (CINESPA)',
  },
  {
    label: 'Escuela de Física, UCR',
    src: '/images/ROSAC/acknowledgments/efis.webp',
    defaultAlt: 'Logo de la Escuela de Física, UCR',
  },
  {
    label: 'Escuela de Ingeniería Mecánica, UCR',
    src: '/images/ROSAC/acknowledgments/eim.webp',
    defaultAlt: 'Logo de la Escuela de Ingeniería Mecánica, UCR',
  },
  {
    label: 'Escuela de Ingeniería Topográfica, UCR',
    src: '/images/ROSAC/acknowledgments/eit.webp',
    defaultAlt: 'Logo de la Escuela de Ingeniería Topográfica, UCR',
  },
  {
    label: 'Escuela de Ingeniería Eléctrica, UCR',
    src: '/images/ROSAC/acknowledgments/eie.webp',
    defaultAlt: 'Logo de la Escuela de Ingeniería Eléctrica, UCR',
  },
  {
    label: 'Recinto de Santa Cruz, UCR',
    src: '/images/ROSAC/acknowledgments/recinto-santa-cruz.webp',
    defaultAlt: 'Logo del Recinto de Santa Cruz, Universidad de Costa Rica',
  },
  {
    label: 'Oficina de Servicios Generales (OSG), UCR',
    src: '/images/ROSAC/acknowledgments/osg.webp',
    defaultAlt: 'Logo de la Oficina de Servicios Generales (OSG), UCR',
  },
  {
    label: 'LanammeUCR',
    src: '/images/ROSAC/acknowledgments/lanamme.webp',
    defaultAlt: 'Logo del Laboratorio Nacional de Materiales y Modelos Estructurales (LanammeUCR)',
  },
  {
    label: 'Radiográfica Costarricense S.A. (RACSA)',
    src: '/images/ROSAC/acknowledgments/racsa.webp',
    defaultAlt: 'Logo de Radiográfica Costarricense S.A. (RACSA)',
  },
  {
    label: 'Bomberos de Costa Rica',
    src: '/images/ROSAC/acknowledgments/bomberos-costa-rica.webp',
    defaultAlt: 'Logo de Bomberos de Costa Rica',
  },
  {
    label: 'Instituto Geográfico Nacional',
    src: '/images/ROSAC/acknowledgments/instituto-geografico-nacional.webp',
    defaultAlt: 'Logo del Instituto Geográfico Nacional, Registro Nacional de Costa Rica',
  },
  {
    label: 'INDI CR',
    src: '/images/ROSAC/acknowledgments/indi.webp',
    defaultAlt: 'Logo de INDI, Ingeniería y Diseño',
  },
  {
    label: 'Prysmian Group',
    src: '/images/ROSAC/acknowledgments/prysmian-group.webp',
    defaultAlt: 'Logo de Prysmian Group',
  },
  {
    label: 'EATON Costa Rica',
    src: '/images/ROSAC/acknowledgments/eaton.webp',
    defaultAlt: 'Logo de EATON Costa Rica',
  },
  {
    label: 'INAOE, México',
    src: '/images/ROSAC/acknowledgments/inaoe.webp',
    defaultAlt: 'Logo del Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE)',
  },
  {
    label: 'AMEXCID',
    src: '/images/ROSAC/acknowledgments/amexcid.webp',
    defaultAlt:
      'Logo de la Agencia Mexicana de Cooperación Internacional para el Desarrollo (AMEXCID)',
  },
]

const LOGO_SOURCE_OPTIONS: FormFieldOption[] = [
  { value: 'custom', label: 'Subir logo personalizado' },
  ...PREDEFINED_ACKNOWLEDGMENT_LOGOS.map((item, index) => ({
    value: String(index),
    label: `Seleccionar de la lista: ${item.label}`,
  })),
]

export function RosacAcknowledgmentForm({
  institution,
  onSave,
  onCancel,
}: RosacAcknowledgmentFormProps) {
  const formId = useId()
  const [name, setName] = useState(institution?.name ?? '')
  const [logoAlt, setLogoAlt] = useState(institution?.logo?.alt ?? '')

  // Determine initial logo selection (defaults to custom upload for new institutions)
  const initialPresetIndex = institution
    ? PREDEFINED_ACKNOWLEDGMENT_LOGOS.findIndex((p) => p.src === institution.logo?.src)
    : -1

  const [logoSelection, setLogoSelection] = useState<string>(
    initialPresetIndex >= 0 ? String(initialPresetIndex) : 'custom',
  )
  const customSrc = initialPresetIndex === -1 && institution?.logo?.src ? institution.logo.src : ''
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const isCustomMode = logoSelection === 'custom'
  const selectedPreset =
    !isCustomMode && Number(logoSelection) >= 0
      ? PREDEFINED_ACKNOWLEDGMENT_LOGOS[Number(logoSelection)]
      : null

  const activeLogoSrc = isCustomMode
    ? logoFile
      ? URL.createObjectURL(logoFile)
      : customSrc
    : (selectedPreset?.src ?? '')

  const hasLogo = !logoRemoved && (Boolean(activeLogoSrc) || Boolean(logoFile))

  // Validation
  const nameError =
    hasAttemptedSubmit && name.trim() === '' ? 'El nombre de la institución es obligatorio.' : null
  const logoError =
    hasAttemptedSubmit && !hasLogo ? 'Debe seleccionar o subir un logo para la institución.' : null

  const isFormValid = name.trim() !== '' && hasLogo

  const isDirty =
    name !== (institution?.name ?? '') ||
    logoAlt !== (institution?.logo?.alt ?? '') ||
    logoFile !== null ||
    logoRemoved ||
    activeLogoSrc !== (institution?.logo?.src ?? '')

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  async function handleSaveClick() {
    setHasAttemptedSubmit(true)
    if (!isFormValid) {
      if (name.trim() === '') {
        document.getElementById(`${formId}-name`)?.focus()
      }
      return
    }

    if (isUploading) return

    let finalLogoUrl = ''

    if (isCustomMode) {
      if (logoFile) {
        setIsUploading(true)
        setUploadError(null)
        try {
          const formData = new FormData()
          formData.set('file', logoFile)
          const result = await uploadAcknowledgmentLogo(formData)
          if (!result.ok) {
            setIsUploading(false)
            setUploadError(result.error)
            return
          }
          finalLogoUrl = result.imageUrl
        } catch {
          setIsUploading(false)
          setUploadError('No se pudo subir el logo. Inténtelo de nuevo.')
          return
        }
        setIsUploading(false)
      } else {
        finalLogoUrl = customSrc
      }
    } else if (selectedPreset) {
      finalLogoUrl = selectedPreset.src
    }

    const trimmedName = name.trim()
    const finalAlt = logoAlt.trim() || `Logo de ${trimmedName}`

    onSave({
      name: trimmedName,
      logo: {
        src: finalLogoUrl,
        alt: finalAlt,
      },
    })
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
        label="Nombre de la institución"
        onChange={(val) => {
          setName(val)
          if (!logoAlt && !institution) {
            setLogoAlt(`Logo de ${val.trim()}`)
          }
        }}
        placeholder="Ej. Centro de Investigaciones Espaciales (CINESPA), UCR"
        required
        value={name}
      />

      <div className="cms-form-field">
        <FormField
          id={`${formId}-logo-selection`}
          label="Escoger un logo personalizado o seleccionar uno de la lista"
          onChange={(val) => {
            setLogoSelection(val)
            if (val !== 'custom') {
              const preset = PREDEFINED_ACKNOWLEDGMENT_LOGOS[Number(val)]
              if (preset) {
                setName(preset.label)
                setLogoAlt(preset.defaultAlt)
              }
            } else {
              if (initialPresetIndex === -1 && institution) {
                setName(institution.name)
                setLogoAlt(institution.logo?.alt ?? '')
              } else {
                setName('')
                setLogoAlt('')
              }
            }
          }}
          options={LOGO_SOURCE_OPTIONS}
          value={logoSelection}
        />
      </div>

      {isCustomMode ? (
        <FileDropInput
          errorMessage={logoError}
          existingImageUrl={!logoRemoved && customSrc ? customSrc : undefined}
          helperText="Formatos WebP, PNG, SVG o JPG (máx. 10 MB)."
          label="Archivo del logo"
          onFileSelect={(file) => {
            setLogoFile(file)
            if (!file) {
              setLogoRemoved(true)
            } else {
              setLogoRemoved(false)
            }
          }}
          required
        />
      ) : activeLogoSrc ? (
        <div style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              position: 'relative',
              width: '90px',
              height: '90px',
              padding: '6px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Image
              alt={logoAlt || 'Vista previa del logo'}
              fill
              sizes="90px"
              src={activeLogoSrc}
              style={{ objectFit: 'contain', padding: '6px' }}
            />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Logo seleccionado:{' '}
            <strong style={{ color: 'var(--foreground)' }}>
              {selectedPreset?.label ?? 'Institucional'}
            </strong>
          </span>
        </div>
      ) : null}

      <FormField
        id={`${formId}-logo-alt`}
        label="Texto alternativo del logo (Accesibilidad)"
        onChange={setLogoAlt}
        placeholder="Descripción accesible del logo institucional"
        value={logoAlt}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} type="button" variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleSaveClick} type="button" variant="primary">
          {isUploading ? 'Guardando...' : institution ? 'Guardar cambios' : 'Agregar institución'}
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
