'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useId, useImperativeHandle, useState, type Ref } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import {
  emptyPeriod,
  formatYearsLabel,
  parseYearsLabel,
  periodError,
  type AlbumPeriod,
  type PeriodError,
  type PeriodPoint,
} from '@/app/lib/gallery-period'
import {
  slugFromTitle,
  albumContent,
  type ReviewConfirmation,
  type StoredAlbumContent,
} from '@/app/lib/gallery-schema'
import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  type FormErrors,
  contentFieldLang,
  contentPath,
  draftFromStored,
  hasContentChanges,
  isConfirmed,
  languageTabFlags,
  tabWithErrors,
  validateContent,
  resetConfirmations,
  reviewsNeeded,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import { languageLabels } from '@/app/lib/publication-form'

import { uploadGalleryImage, type UploadGalleryImageResult } from '@/app/(public)/galeria/actions'

type AlbumTranslatableField = 'title' | 'description'

/** The earliest year offered for an album's period. */
const FIRST_PERIOD_YEAR = 2000

/** Which year select a period error is shown under: the one missing, or the end for an order error. */
function periodErrorField(error: PeriodError, { start }: AlbumPeriod): 'start' | 'end' {
  if (error === 'endBeforeStart') return 'end'
  if (error === 'monthNeedsYear') return start.month && !start.year ? 'start' : 'end'
  return 'start'
}

const periodErrorMessage = {
  monthNeedsYear: 'editor.periodMonthNeedsYear',
  endNeedsStart: 'editor.periodEndNeedsStart',
  endBeforeStart: 'editor.periodEndBeforeStart',
} as const

/** Next year down to `FIRST_PERIOD_YEAR`, plus any stored year outside that range. */
function periodYears(initial: AlbumPeriod): number[] {
  const latest = new Date().getFullYear() + 1
  const years = new Set<number>()
  for (let year = latest; year >= FIRST_PERIOD_YEAR; year -= 1) years.add(year)
  for (const year of [initial.start.year, initial.end.year]) if (year) years.add(year)
  return [...years].sort((a, b) => b - a)
}

function samePoint(a: PeriodPoint, b: PeriodPoint): boolean {
  return a.month === b.month && a.year === b.year
}

/** The translatable text of an album in one language. */
export type AlbumFormContent = Record<AlbumTranslatableField, string>

export interface AlbumFormValues {
  title: string
  description: string
  yearsLabel: string
  /** Permanent URL already uploaded by the time `onSave` runs. */
  coverObjectKey: string
  /** Title and description per language. `title` and `description` above are the Spanish ones. */
  content?: Record<Locale, AlbumFormContent>
}

/** What `onSave` receives: `content` is left out while editing an album whose text did not change. */
export type AlbumFormSaveValues = AlbumFormValues

export interface AlbumFormProps {
  /** The album's current values — the form starts pre-filled with these. */
  album: AlbumFormValues
  /**
   * The text as stored in every language, when editing an existing album. Leave it out to create
   * one, which needs both languages in full.
   */
  stored?: StoredAlbumContent | null
  /** True when the album predates translations, so its base text may not be in Spanish. */
  isLegacy?: boolean
  /** Called once the form is valid, with the confirmations the save still needs. */
  onSave: (values: AlbumFormSaveValues, confirmed: ReviewConfirmation[]) => void
  onCancel: () => void
  /** Creating an album: its URL identifier comes from the title, so the title needs a letter or digit. */
  requireSlug?: boolean
  /** Hides the cover upload when this form creates an album without a cover. */
  showCover?: boolean
  /** Routes modal close requests through the unsaved-changes confirmation. */
  ref?: Ref<AlbumFormHandle>
}

/** Lets the containing modal ask the form to cancel safely before it closes. */
export interface AlbumFormHandle {
  requestCancel: () => void
}

export function AlbumForm({
  album,
  stored = null,
  isLegacy = false,
  onSave,
  onCancel,
  requireSlug = false,
  showCover = true,
  ref,
}: AlbumFormProps) {
  // Everything the editor says follows the site's language; the tabs only pick the translation.
  const t = useTranslations('publications')
  const tGallery = useTranslations('gallery')
  const uiLocale = useLocale() as Locale
  const formId = useId()
  const toast = useToast()
  // In a modal, the language tabs sit beside its title and stay in view while the form scrolls.
  const headerSlot = useModalHeaderSlot()

  const [initialContent] = useState<Record<Locale, AlbumFormContent>>(() => {
    if (stored) return draftFromStored(albumContent, stored)
    return (
      album.content ?? {
        es: { title: album.title, description: album.description },
        en: { title: '', description: '' },
      }
    )
  })
  const [content, setContent] = useState(initialContent)
  const [confirmed, setConfirmed] = useState<ReviewConfirmation[]>([])
  const [tab, setTab] = useState<Locale>(defaultLocale)
  // A label written by hand in another shape is kept as is until a period is chosen.
  const [storedPeriod] = useState(() => parseYearsLabel(album.yearsLabel ?? ''))
  const initialPeriod = storedPeriod ?? emptyPeriod
  const [period, setPeriod] = useState<AlbumPeriod>(initialPeriod)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)

  // Visibility state for the discard confirmation dialog
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const periodChanged =
    !samePoint(period.start, initialPeriod.start) || !samePoint(period.end, initialPeriod.end)

  // Track whether unsaved changes exist
  const isDirty =
    hasAttemptedSubmit ||
    locales.some(
      (locale) =>
        content[locale].title !== initialContent[locale].title ||
        content[locale].description !== initialContent[locale].description,
    ) ||
    periodChanged ||
    coverFile !== null ||
    coverRemoved

  // The cover is only optional while editing an existing album.
  const isEdit = stored !== null
  const hasCover = coverFile !== null || (Boolean(album.coverObjectKey) && !coverRemoved)

  function requestCancel() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    onCancel()
  }

  const needed = reviewsNeeded(albumContent, stored, content)
  // An existing album saved without touching its text only updates its shared fields.
  const contentChanged = hasContentChanges(albumContent, stored, content)

  function updateContent(locale: Locale, field: AlbumTranslatableField, value: string) {
    setContent((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
    if (locale === defaultLocale && field === 'title') setSlugError(null)
  }

  function reviewControl(locale: Locale, field: AlbumTranslatableField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(albumContent, review, uiLocale)}
        message={reviewMessage(albumContent, review, stored, content, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  const errors: FormErrors = hasAttemptedSubmit
    ? validateContent(albumContent, stored, content, confirmed, uiLocale)
    : {}

  const currentPeriodError = periodError(period)
  const shownPeriodError = hasAttemptedSubmit ? currentPeriodError : null

  function periodFieldError(end: 'start' | 'end'): string | undefined {
    if (!shownPeriodError || periodErrorField(shownPeriodError, period) !== end) return undefined
    return tGallery(periodErrorMessage[shownPeriodError])
  }

  function updatePeriod(end: 'start' | 'end', part: keyof PeriodPoint, value: string) {
    setPeriod((current) => ({
      ...current,
      [end]: { ...current[end], [part]: value ? Number(value) : null },
    }))
  }

  const none = { value: '', label: tGallery('editor.periodNone') }
  const yearOptions = [
    none,
    ...periodYears(initialPeriod).map((year) => ({ value: String(year), label: String(year) })),
  ]
  const monthFormat = new Intl.DateTimeFormat(uiLocale, { month: 'long', timeZone: 'UTC' })
  const monthOptions = [
    none,
    ...Array.from({ length: 12 }, (_, index) => ({
      value: String(index + 1),
      label: monthFormat.format(Date.UTC(2000, index, 1)),
    })),
  ]

  function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    const found = validateContent(albumContent, stored, content, confirmed, uiLocale)
    const target = tabWithErrors(found, tab)

    if (target) setTab(target)

    if (Object.keys(found).length > 0) return

    if (requireSlug && !slugFromTitle(content[defaultLocale].title)) {
      setSlugError(tGallery('editor.titleNeedsLettersOrNumbers'))
      setTab(defaultLocale)
      return
    }

    if (showCover && !isEdit && !hasCover) return

    if (currentPeriodError) return

    handleConfirmSave()
  }

  async function handleConfirmSave() {
    let coverObjectKey = album.coverObjectKey

    if (coverFile) {
      setIsUploading(true)

      let result: UploadGalleryImageResult

      try {
        const formData = new FormData()
        formData.set('file', coverFile)

        result = await uploadGalleryImage(formData)
      } catch {
        setIsUploading(false)
        toast.show('error', tGallery('editor.uploadFailed'))
        return
      }

      setIsUploading(false)

      if (!result.ok) {
        toast.show('error', result.error)
        return
      }

      coverObjectKey = result.imageUrl
    }

    if (coverRemoved && !coverFile) {
      coverObjectKey = ''
    }

    onSave(
      {
        title: content[defaultLocale].title,
        description: content[defaultLocale].description,
        ...(contentChanged ? { content } : {}),
        yearsLabel:
          storedPeriod === null && !periodChanged
            ? (album.yearsLabel ?? '')
            : formatYearsLabel(period),
        coverObjectKey,
      },
      confirmationsStillNeeded(confirmed, needed),
    )
  }

  return (
    <div className="gallery-album-form">
      {showCover ? (
        <FileDropInput
          existingImageUrl={album.coverObjectKey}
          helperText={tGallery('editor.albumCoverHelperText')}
          errorMessage={
            hasAttemptedSubmit && !isEdit && !hasCover
              ? tGallery('editor.albumCoverRequired')
              : null
          }
          label={tGallery('editor.albumCoverField')}
          onFileSelect={(file) => {
            setCoverFile(file)
            setCoverRemoved(file === null)
          }}
          required={!isEdit}
          descriptionText={t('editor.FileDropDescriptionText')}
          rejectionFormatMessage={t('editor.FileDropRejectionFormatMessage')}
          rejectionSizeMessage={t('editor.FileDropRejectionSizeMessage')}
        />
      ) : null}

      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        label={t('editor.languageTabs')}
        onSelect={setTab}
        selected={tab}
        tablistContainer={headerSlot}
      >
        {(locale) => (
          <>
            {isLegacy && locale === defaultLocale ? (
              <Notice>{tGallery('editor.legacyBaseText')}</Notice>
            ) : null}

            {isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">{tGallery('editor.legacyNoTranslation')}</Notice>
            ) : null}

            <FormField
              id={`${formId}-${locale}-title`}
              label={t('editor.titleField', { language: languageLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => updateContent(locale, 'title', value)}
              required
              error={
                errors[contentPath(locale, 'title')] ??
                (locale === defaultLocale ? (slugError ?? undefined) : undefined)
              }
              value={content[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              id={`${formId}-${locale}-description`}
              label={t('editor.descriptionField', { language: languageLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => updateContent(locale, 'description', value)}
              required
              error={errors[contentPath(locale, 'description')]}
              value={content[locale].description}
            />
            {reviewControl(locale, 'description')}
          </>
        )}
      </LanguageTabs>

      {storedPeriod === null && !periodChanged ? (
        <Notice>{tGallery('editor.periodUnrecognized', { label: album.yearsLabel })}</Notice>
      ) : null}

      {(['start', 'end'] as const).map((end) => (
        <div className="cms-form-grid cms-form-grid-2" key={end}>
          <FormField
            error={periodFieldError(end)}
            id={`${formId}-${end}-year`}
            label={tGallery(end === 'start' ? 'editor.periodStartYear' : 'editor.periodEndYear')}
            onChange={(value) => updatePeriod(end, 'year', value)}
            options={yearOptions}
            value={period[end].year ? String(period[end].year) : ''}
          />
          <FormField
            id={`${formId}-${end}-month`}
            label={tGallery(end === 'start' ? 'editor.periodStartMonth' : 'editor.periodEndMonth')}
            onChange={(value) => updatePeriod(end, 'month', value)}
            options={monthOptions}
            value={period[end].month ? String(period[end].month) : ''}
          />
        </div>
      ))}

      <div className="cms-form-actions">
        <Button onClick={requestCancel} variant="secondary">
          {t('editor.cancel')}
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? <>{t('editor.uploadingImage')}</> : <>{t('editor.save')}</>}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('discardDialog.message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discardDialog.title')}
      />
    </div>
  )
}
