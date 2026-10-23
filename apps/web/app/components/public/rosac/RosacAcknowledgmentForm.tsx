'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { uploadAcknowledgmentLogo } from '@/app/(public)/radioastronomia/actions'
import { defaultLocale, isLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
  draftFromStored,
  hasContentChanges,
  isConfirmed,
  languageTabFlags,
  resetConfirmations,
  reviewsNeeded,
  tabWithErrors,
  toContentInput,
  validateContent,
  withConfirmation,
  type ContentDraft,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import {
  rosacAcknowledgmentContent,
  type RosacAcknowledgment,
  type RosacAcknowledgmentCreateInput,
  type RosacAcknowledgmentField,
  type RosacAcknowledgmentUpdateInput,
} from '@/app/lib/rosac-schema'

export type RosacAcknowledgmentFormBody =
  RosacAcknowledgmentCreateInput | RosacAcknowledgmentUpdateInput

export interface RosacAcknowledgmentFormProps {
  /** Existing institution acknowledgment or null when creating a new one. */
  institution: RosacAcknowledgment | null
  onSave: (values: RosacAcknowledgmentFormBody) => void
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
  const t = useTranslations('rosac.editor')
  const siteLocale = useLocale()
  const uiLocale: Locale = isLocale(siteLocale) ? siteLocale : defaultLocale
  const stored =
    institution?.editing?.content ??
    (institution
      ? {
          es: { name: institution.name },
          en: null,
        }
      : null)

  const formRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [draft, setDraft] = useState<ContentDraft<RosacAcknowledgmentField>>(() =>
    draftFromStored(rosacAcknowledgmentContent, stored),
  )
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<RosacAcknowledgmentField>[]>([])
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

  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
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

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  const needed = reviewsNeeded(rosacAcknowledgmentContent, stored, draft)
  const errors = attempted
    ? validateContent(rosacAcknowledgmentContent, stored, draft, confirmed, uiLocale)
    : {}

  const logoError =
    attempted && !hasLogo ? 'Debe seleccionar o subir un logo para la institución.' : null

  const contentChanged = hasContentChanges(rosacAcknowledgmentContent, stored, draft)
  const isLogoDirty =
    activeLogoSrc !== (institution?.logo?.src ?? '') ||
    logoAlt.trim() !== (institution?.logo?.alt ?? '').trim()
  const isDirty = contentChanged || isLogoDirty || logoFile !== null || logoRemoved

  function setContent(locale: Locale, field: RosacAcknowledgmentField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onCancel()
  }

  async function handleConfirmClick() {
    setAttempted(true)
    const found = validateContent(rosacAcknowledgmentContent, stored, draft, confirmed, uiLocale)

    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((current) => current + 1)
      return
    }

    if (!hasLogo) {
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

    const currentName = draft[defaultLocale].name.trim()
    const content = toContentInput(rosacAcknowledgmentContent, draft)
    const finalAlt = logoAlt.trim() || `Logo de ${currentName}`
    const logo = {
      src: finalLogoUrl,
      alt: finalAlt,
    }

    if (!institution) {
      onSave({
        content,
        logo,
      })
    } else {
      onSave({
        version: institution.editing?.version ?? '',
        ...(contentChanged
          ? { content, confirmedUnchanged: confirmationsStillNeeded(confirmed, needed) }
          : {}),
        ...(isLogoDirty ? { logo } : {}),
      })
    }
  }

  function reviewControl(locale: Locale, field: RosacAcknowledgmentField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(rosacAcknowledgmentContent, review, uiLocale)}
        message={reviewMessage(rosacAcknowledgmentContent, review, stored, draft, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <div className="cms-form" ref={formRef}>
      {uploadError ? (
        <p className="form-alert" role="alert">
          {uploadError}
        </p>
      ) : null}

      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        label={t('languageTabs')}
        onSelect={setTab}
        selected={tab}
      >
        {(locale) => (
          <>
            {institution?.editing?.isLegacy && locale === defaultLocale ? (
              <Notice>{t('legacyBaseText')}</Notice>
            ) : null}

            {institution?.editing?.isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">{t('legacyNoTranslation')}</Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'name')]}
              id={`${formId}-${locale}-name`}
              label={t('nameIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => {
                setContent(locale, 'name', value)
                if (locale === defaultLocale && !logoAlt && !institution) {
                  setLogoAlt(`Logo de ${value.trim()}`)
                }
              }}
              required
              value={draft[locale].name}
            />
            {reviewControl(locale, 'name')}
          </>
        )}
      </LanguageTabs>

      <div className="cms-form-field">
        <FormField
          id={`${formId}-logo-selection`}
          label="Escoger un logo personalizado o seleccionar uno de la lista"
          onChange={(val) => {
            setLogoSelection(val)
            if (val !== 'custom') {
              const preset = PREDEFINED_ACKNOWLEDGMENT_LOGOS[Number(val)]
              if (preset) {
                setContent(defaultLocale, 'name', preset.label)
                setLogoAlt(preset.defaultAlt)
              }
            } else {
              if (initialPresetIndex === -1 && institution) {
                setContent(defaultLocale, 'name', institution.name)
                setLogoAlt(institution.logo?.alt ?? '')
              } else {
                setContent(defaultLocale, 'name', '')
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
        <Button onClick={handleCancelClick} variant="secondary">
          {t('cancel')}
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? t('saving') : t('save')}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardCancel')}
        confirmLabel={t('discardConfirm')}
        message={t('discardMessage')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onCancel()
        }}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discardTitle')}
      />
    </div>
  )
}
