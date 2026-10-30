import Image from 'next/image'
import { useId, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { uploadAcknowledgmentLogo } from '@/app/(public)/radioastronomia/actions'
import type { RosacAcknowledgment } from '@/app/lib/rosac'

export interface RosacAcknowledgmentFormValues {
  name: string
  href?: string
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

export interface PredefinedAcknowledgmentLogo {
  label: string
  src: string
  defaultAlt: string
  defaultAltEn: string
  defaultHref?: string
}

export const PREDEFINED_ACKNOWLEDGMENT_LOGOS: readonly PredefinedAcknowledgmentLogo[] = [
  {
    label: 'Vicerrectoría de Investigación, UCR',
    src: '/images/ROSAC/acknowledgments/vicerrectoria-investigacion.webp',
    defaultAlt: 'Logo de la Vicerrectoría de Investigación de la Universidad de Costa Rica',
    defaultAltEn: 'Logo of the Vice-Rectorate for Research, University of Costa Rica',
    defaultHref: 'https://vinv.ucr.ac.cr',
  },
  {
    label: 'Centro de Investigaciones Espaciales (CINESPA), UCR',
    src: '/images/ROSAC/acknowledgments/cinespa.webp',
    defaultAlt: 'Logo del Centro de Investigaciones Espaciales (CINESPA)',
    defaultAltEn: 'Logo of the Space Research Center (CINESPA)',
    defaultHref: 'https://cinespa.ucr.ac.cr',
  },
  {
    label: 'Escuela de Física, UCR',
    src: '/images/ROSAC/acknowledgments/efis.webp',
    defaultAlt: 'Logo de la Escuela de Física, UCR',
    defaultAltEn: 'Logo of the School of Physics, UCR',
    defaultHref: 'https://fisica.ucr.ac.cr',
  },
  {
    label: 'Escuela de Ingeniería Mecánica, UCR',
    src: '/images/ROSAC/acknowledgments/eim.webp',
    defaultAlt: 'Logo de la Escuela de Ingeniería Mecánica, UCR',
    defaultAltEn: 'Logo of the School of Mechanical Engineering, UCR',
    defaultHref: 'https://www.ucr.ac.cr/directorio/escuela-de-ingenieria-mecanica.html',
  },
  {
    label: 'Escuela de Ingeniería Topográfica, UCR',
    src: '/images/ROSAC/acknowledgments/eit.webp',
    defaultAlt: 'Logo de la Escuela de Ingeniería Topográfica, UCR',
    defaultAltEn: 'Logo of the School of Surveying Engineering, UCR',
    defaultHref: 'https://eit.ucr.ac.cr/',
  },
  {
    label: 'Escuela de Ingeniería Eléctrica, UCR',
    src: '/images/ROSAC/acknowledgments/eie.webp',
    defaultAlt: 'Logo de la Escuela de Ingeniería Eléctrica, UCR',
    defaultAltEn: 'Logo of the School of Electrical Engineering, UCR',
    defaultHref: 'https://eie.ucr.ac.cr',
  },
  {
    label: 'Recinto de Santa Cruz, UCR',
    src: '/images/ROSAC/acknowledgments/recinto-santa-cruz.webp',
    defaultAlt: 'Logo del Recinto de Santa Cruz, Universidad de Costa Rica',
    defaultAltEn: 'Logo of the Santa Cruz Campus, University of Costa Rica',
    defaultHref: 'https://www.ucr.ac.cr/directorio/recinto-universitario-de-santa-cruz/',
  },
  {
    label: 'Oficina de Servicios Generales (OSG), UCR',
    src: '/images/ROSAC/acknowledgments/osg.webp',
    defaultAlt: 'Logo de la Oficina de Servicios Generales (OSG), UCR',
    defaultAltEn: 'Logo of the General Services Office (OSG), UCR',
    defaultHref: 'https://osg.ucr.ac.cr',
  },
  {
    label: 'LanammeUCR',
    src: '/images/ROSAC/acknowledgments/lanamme.webp',
    defaultAlt: 'Logo del Laboratorio Nacional de Materiales y Modelos Estructurales (LanammeUCR)',
    defaultAltEn: 'Logo of the National Laboratory of Materials and Structural Models (LanammeUCR)',
    defaultHref: 'https://www.lanamme.ucr.ac.cr/',
  },
  {
    label: 'Radiográfica Costarricense S.A. (RACSA)',
    src: '/images/ROSAC/acknowledgments/racsa.webp',
    defaultAlt: 'Logo de Radiográfica Costarricense S.A. (RACSA)',
    defaultAltEn: 'Logo of Radiográfica Costarricense S.A. (RACSA)',
    defaultHref: 'https://www.racsa.go.cr/',
  },
  {
    label: 'Bomberos de Costa Rica',
    src: '/images/ROSAC/acknowledgments/bomberos-costa-rica.webp',
    defaultAlt: 'Logo de Bomberos de Costa Rica',
    defaultAltEn: 'Logo of the Costa Rica Fire Department',
    defaultHref: 'https://www.bomberos.go.cr',
  },
  {
    label: 'Instituto Geográfico Nacional',
    src: '/images/ROSAC/acknowledgments/instituto-geografico-nacional.webp',
    defaultAlt: 'Logo del Instituto Geográfico Nacional, Registro Nacional de Costa Rica',
    defaultAltEn: 'Logo of the National Geographic Institute, National Registry of Costa Rica',
    defaultHref: 'https://www.snitcr.go.cr/ign_ign',
  },
  {
    label: 'INDI CR',
    src: '/images/ROSAC/acknowledgments/indi.webp',
    defaultAlt: 'Logo de INDI, Ingeniería y Diseño',
    defaultAltEn: 'Logo of INDI, Engineering and Design',
    defaultHref: 'https://www.indicr.com/',
  },
  {
    label: 'Prysmian Group',
    src: '/images/ROSAC/acknowledgments/prysmian-group.webp',
    defaultAlt: 'Logo de Prysmian Group',
    defaultAltEn: 'Logo of Prysmian Group',
    defaultHref: '',
  },
  {
    label: 'EATON Costa Rica',
    src: '/images/ROSAC/acknowledgments/eaton.webp',
    defaultAlt: 'Logo de EATON Costa Rica',
    defaultAltEn: 'Logo of EATON Costa Rica',
    defaultHref: 'https://www.eaton.com/cr/es-mx/company.html',
  },
  {
    label: 'INAOE, México',
    src: '/images/ROSAC/acknowledgments/inaoe.webp',
    defaultAlt: 'Logo del Instituto Nacional de Astrofísica, Óptica y Electrónica (INAOE)',
    defaultAltEn: 'Logo of the National Institute of Astrophysics, Optics and Electronics (INAOE)',
    defaultHref: 'https://www.inaoep.mx',
  },
  {
    label: 'AMEXCID',
    src: '/images/ROSAC/acknowledgments/amexcid.webp',
    defaultAlt:
      'Logo de la Agencia Mexicana de Cooperación Internacional para el Desarrollo (AMEXCID)',
    defaultAltEn: 'Logo of the Mexican Agency for International Development Cooperation (AMEXCID)',
    defaultHref: 'https://www.gob.mx/amexcid',
  },
]

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const LOGO_SOURCE_OPTIONS: FormFieldOption[] = [
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
  const t = useTranslations('rosac.editor')
  const locale = useLocale()
  const formId = useId()
  const [name, setName] = useState(institution?.name ?? '')
  const [href, setHref] = useState(institution?.href ?? '')
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
  const toast = useToast()
  // A failed upload is an action outcome, so it is reported with a toast (see "Feedback" in
  // `AGENTS.md`). The previous attempt's toast is dismissed on retry so errors do not pile up.
  const uploadErrorToast = useRef<number | null>(null)

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const logoSourceOptions: FormFieldOption[] = useMemo(
    () => [
      { value: 'custom', label: t('acknowledgments.logoSourceCustom') },
      ...PREDEFINED_ACKNOWLEDGMENT_LOGOS.map((item, index) => ({
        value: String(index),
        label: t('acknowledgments.logoSourcePreset', { label: item.label }),
      })),
    ],
    [t],
  )

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
  const trimmedName = name.trim()
  const trimmedHref = href.trim()
  const nameError =
    hasAttemptedSubmit && trimmedName === '' ? t('acknowledgments.nameRequired') : null
  const hrefError =
    hasAttemptedSubmit && trimmedHref !== '' && !isValidUrl(trimmedHref)
      ? t('acknowledgments.institutionUrlInvalid')
      : null
  const logoError = hasAttemptedSubmit && !hasLogo ? t('acknowledgments.logoRequired') : null

  const isFormValid =
    trimmedName !== '' && hasLogo && (trimmedHref === '' || isValidUrl(trimmedHref))

  const isDirty =
    name !== (institution?.name ?? '') ||
    href !== (institution?.href ?? '') ||
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
      if (trimmedName === '') {
        document.getElementById(`${formId}-name`)?.focus()
      } else if (trimmedHref !== '' && !isValidUrl(trimmedHref)) {
        document.getElementById(`${formId}-href`)?.focus()
      }
      return
    }

    if (isUploading) return

    if (uploadErrorToast.current !== null) {
      toast.dismiss(uploadErrorToast.current)
      uploadErrorToast.current = null
    }

    let finalLogoUrl = ''

    if (isCustomMode) {
      if (logoFile) {
        setIsUploading(true)
        try {
          const formData = new FormData()
          formData.set('file', logoFile)
          const result = await uploadAcknowledgmentLogo(formData)
          if (!result.ok) {
            setIsUploading(false)
            uploadErrorToast.current = toast.show('error', result.error)
            return
          }
          finalLogoUrl = result.imageUrl
        } catch {
          setIsUploading(false)
          uploadErrorToast.current = toast.show('error', t('acknowledgments.uploadError'))
          return
        }
        setIsUploading(false)
      } else {
        finalLogoUrl = customSrc
      }
    } else if (selectedPreset) {
      finalLogoUrl = selectedPreset.src
    }

    const finalAlt =
      logoAlt.trim() ||
      t('acknowledgments.logoAltDefault', {
        name: trimmedName,
      })

    onSave({
      name: trimmedName,
      href: trimmedHref || undefined,
      logo: {
        src: finalLogoUrl,
        alt: finalAlt,
      },
    })
  }

  return (
    <div className="cms-form">
      <FormField
        errorMessage={nameError}
        id={`${formId}-name`}
        label={t('acknowledgments.nameLabel')}
        onChange={(val) => {
          setName(val)
          if (!logoAlt && !institution) {
            setLogoAlt(t('acknowledgments.logoAltDefault', { name: val.trim() }))
          }
        }}
        placeholder={t('acknowledgments.namePlaceholder')}
        required
        value={name}
      />

      <FormField
        errorMessage={hrefError}
        id={`${formId}-href`}
        label={t('acknowledgments.institutionUrlLabel')}
        onChange={setHref}
        placeholder={t('acknowledgments.institutionUrlPlaceholder')}
        value={href}
      />

      <div className="cms-form-field">
        <FormField
          id={`${formId}-logo-selection`}
          label={t('acknowledgments.logoSourceLabel')}
          onChange={(val) => {
            setLogoSelection(val)
            if (val !== 'custom') {
              const preset = PREDEFINED_ACKNOWLEDGMENT_LOGOS[Number(val)]
              if (preset) {
                setName(preset.label)
                setLogoAlt(locale === 'en' ? preset.defaultAltEn : preset.defaultAlt)
                setHref(preset.defaultHref ?? '')
              }
            } else {
              if (initialPresetIndex === -1 && institution) {
                setName(institution.name)
                setHref(institution.href ?? '')
                setLogoAlt(institution.logo?.alt ?? '')
              } else {
                setName('')
                setHref('')
                setLogoAlt('')
              }
            }
          }}
          options={logoSourceOptions}
          value={logoSelection}
        />
      </div>

      {isCustomMode ? (
        <FileDropInput
          errorMessage={logoError}
          existingImageUrl={!logoRemoved && customSrc ? customSrc : undefined}
          helperText={t('acknowledgments.logoFileHelp')}
          label={t('acknowledgments.logoFileLabel')}
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
            {t('acknowledgments.selectedLogo')}{' '}
            <strong style={{ color: 'var(--foreground)' }}>
              {selectedPreset?.label ?? t('acknowledgments.institutional')}
            </strong>
          </span>
        </div>
      ) : null}

      <FormField
        id={`${formId}-logo-alt`}
        label={t('acknowledgments.logoAltLabel')}
        onChange={setLogoAlt}
        placeholder={t('acknowledgments.logoAltPlaceholder')}
        value={logoAlt}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} type="button" variant="secondary">
          {t('acknowledgments.cancel')}
        </Button>
        <Button disabled={isUploading} onClick={handleSaveClick} type="button" variant="primary">
          {isUploading
            ? t('acknowledgments.saving')
            : institution
              ? t('acknowledgments.save')
              : t('acknowledgments.add')}
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
