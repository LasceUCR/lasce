'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { uploadInstrumentImage } from '@/app/(public)/radioastronomia/actions'
import { defaultLocale, isLocale, localeLabels, locales, type Locale } from '@/app/lib/i18n/config'
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
  rosacInstrumentContent,
  type RosacInstrumentField,
  type RosacInstrumentInput,
} from '@/app/lib/rosac'
import type { RosacInstrumentCardContent } from '@/app/lib/rosac-instruments'
import { rosacInstruments } from '@/app/lib/scientific-data'

export type ConsultationMode = 'simulation' | 'custom' | 'disabled'

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

export type RosacInstrumentFormBody = RosacInstrumentInput

export interface RosacInstrumentFormProps {
  instrument: RosacInstrumentCardContent | null
  onSave: (body: RosacInstrumentFormBody) => void | Promise<void>
  onCancel: () => void
}

export const DEFAULT_INSTRUMENT_IMAGE = {
  src: '/images/ROSAC/construction/Fotogrametria/Fotogrametria_1.jpg',
  alt: 'Imagen ilustrativa del instrumento ROSAC',
}

export function RosacInstrumentForm({ instrument, onSave, onCancel }: RosacInstrumentFormProps) {
  const t = useTranslations('rosac.editor')
  const tRosacProducts = useTranslations('rosac.instruments.products')
  const siteLocale = useLocale()
  const uiLocale: Locale = isLocale(siteLocale) ? siteLocale : defaultLocale
  const stored =
    instrument?.editing?.content ??
    (instrument
      ? {
          es: {
            name: instrument.name,
            description: instrument.consultation?.notice ?? instrument.pendingMessage ?? '',
          },
          en: null,
        }
      : null)

  const formRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [draft, setDraft] = useState<ContentDraft<RosacInstrumentField>>(() =>
    draftFromStored(rosacInstrumentContent, stored),
  )
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<RosacInstrumentField>[]>([])
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)

  // Shared fields state
  const initialConsultation = getInitialConsultationState(instrument)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const toast = useToast()
  // A failed upload is an action outcome, so it is reported with a toast (see "Feedback" in
  // `AGENTS.md`). The previous attempt's toast is dismissed on retry so errors do not pile up.
  const uploadErrorToast = useRef<number | null>(null)
  const imageSrc = instrument?.image?.src ?? ''
  const [imageAlt, setImageAlt] = useState(instrument?.image?.alt ?? '')

  const [consultationMode, setConsultationMode] = useState<ConsultationMode>(
    initialConsultation.mode,
  )
  const [simulationTarget, setSimulationTarget] = useState(initialConsultation.target)
  const [customHref, setCustomHref] = useState(initialConsultation.customHref)
  const [consultationLabel, setConsultationLabel] = useState(instrument?.consultation?.label ?? '')

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

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

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  const needed = reviewsNeeded(rosacInstrumentContent, stored, draft)
  const errors = attempted
    ? validateContent(rosacInstrumentContent, stored, draft, confirmed, uiLocale)
    : {}

  const hasImage = imageFile !== null || (Boolean(imageSrc) && !imageRemoved)
  const imageError = attempted && !hasImage ? t('instruments.imageRequired') : null
  const customHrefError =
    attempted && consultationMode === 'custom' && customHref.trim() === ''
      ? t('instruments.customHrefRequired')
      : null

  const contentChanged = hasContentChanges(rosacInstrumentContent, stored, draft)
  const hasTypedText = locales.some((locale) =>
    rosacInstrumentContent.fields.some((field) => draft[locale][field].trim() !== ''),
  )

  const isConsultationDirty =
    consultationLabel !== (instrument?.consultation?.label ?? '') ||
    consultationMode !== initialConsultation.mode ||
    (consultationMode === 'simulation' && simulationTarget !== initialConsultation.target) ||
    (consultationMode === 'custom' && customHref !== initialConsultation.customHref)

  const isImageDirty =
    imageFile !== null || imageRemoved || imageAlt !== (instrument?.image?.alt ?? '')
  const isDirty = instrument
    ? contentChanged || isConsultationDirty || isImageDirty
    : hasTypedText || isImageDirty || isConsultationDirty

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onCancel()
  }

  function setContent(locale: Locale, field: RosacInstrumentField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  async function handleConfirmClick() {
    setAttempted(true)
    const found = validateContent(rosacInstrumentContent, stored, draft, confirmed, uiLocale)

    if (
      Object.keys(found).length > 0 ||
      !hasImage ||
      (consultationMode === 'custom' && !customHref.trim())
    ) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((current) => current + 1)
      return
    }

    if (instrument && !contentChanged && !isImageDirty && !isConsultationDirty) {
      onCancel()
      return
    }

    if (uploadErrorToast.current !== null) {
      toast.dismiss(uploadErrorToast.current)
      uploadErrorToast.current = null
    }

    let finalImageUrl = imageRemoved ? '' : imageSrc
    if (imageFile) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.set('file', imageFile)
        const result = await uploadInstrumentImage(formData)
        if (!result.ok) {
          setIsUploading(false)
          uploadErrorToast.current = toast.show('error', result.error)
          return
        }
        finalImageUrl = result.imageUrl
      } catch {
        setIsUploading(false)
        uploadErrorToast.current = toast.show('error', t('instruments.uploadError'))
        return
      }
      setIsUploading(false)
    }

    let finalConsultationHref: string | undefined = undefined
    if (consultationMode === 'simulation') {
      finalConsultationHref = getSimulationUrl(simulationTarget)
    } else if (consultationMode === 'custom') {
      finalConsultationHref = customHref.trim() || undefined
    }

    const currentName = draft[defaultLocale].name.trim()
    const content = toContentInput(rosacInstrumentContent, draft)
    const image = hasImage
      ? {
          src: finalImageUrl,
          alt: imageAlt.trim() || t('instruments.imageAltDefault', { name: currentName }),
        }
      : undefined

    const consultation = {
      label:
        consultationLabel.trim() ||
        t('instruments.consultationLabelPlaceholder', { name: currentName }),
      href: finalConsultationHref,
    }

    if (!instrument) {
      onSave({
        content,
        image,
        consultation,
      })
    } else {
      onSave({
        version: instrument.editing?.version ?? '',
        ...(contentChanged
          ? { content, confirmedUnchanged: confirmationsStillNeeded(confirmed, needed) }
          : {}),
        ...(isImageDirty ? { image } : {}),
        ...(isConsultationDirty ? { consultation } : {}),
      })
    }
  }

  function reviewControl(locale: Locale, field: RosacInstrumentField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(rosacInstrumentContent, review, uiLocale)}
        message={reviewMessage(rosacInstrumentContent, review, stored, draft, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <div className="cms-form" ref={formRef}>
      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        label={t('languageTabs')}
        onSelect={setTab}
        selected={tab}
      >
        {(locale) => (
          <>
            {instrument?.editing?.isLegacy && locale === defaultLocale ? (
              <Notice>{t('legacyBaseText')}</Notice>
            ) : null}

            {instrument?.editing?.isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">{t('legacyNoTranslation')}</Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'name')]}
              id={`${formId}-${locale}-name`}
              label={t('nameIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => setContent(locale, 'name', value)}
              required
              value={draft[locale].name}
            />
            {reviewControl(locale, 'name')}

            <FormField
              error={errors[contentPath(locale, 'description')]}
              id={`${formId}-${locale}-description`}
              label={t('descriptionIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => setContent(locale, 'description', value)}
              required
              value={draft[locale].description}
            />
            {reviewControl(locale, 'description')}
          </>
        )}
      </LanguageTabs>

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
          placeholder={t('instruments.consultationLabelDefault')}
          value={consultationLabel}
        />
      </div>

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
