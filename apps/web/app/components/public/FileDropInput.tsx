'use client'

import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useTranslations } from 'next-intl'

import { IconButton } from './IconButton'

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

/** Mirrors MINIO service's 25 MiB cap so an oversize file is refused before it is sent. */
const MAX_FILE_BYTES = 25 * 1024 * 1024

function isAccepted(file: File, accept: string): boolean {
  const allowed = accept.split(',').map((entry) => entry.trim().toLowerCase())
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return allowed.some((entry) =>
    entry.startsWith('.')
      ? name.endsWith(entry)
      : entry.endsWith('/*')
        ? type.startsWith(entry.slice(0, -1))
        : type === entry,
  )
}

export interface FileDropInputProps {
  label: string
  accept?: string
  existingImageUrl?: string
  onFileSelect: (file: File | null) => void
  helperText?: string
  required?: boolean
  disabled?: boolean
  errorMessage?: string | null
  rejectionFormatMessage?: string
  rejectionSizeMessage?: string
  descriptionText?: string
}

export function FileDropInput({
  label,
  accept = DEFAULT_ACCEPT,
  existingImageUrl,
  onFileSelect,
  helperText,
  required = false,
  disabled = false,
  errorMessage,
  rejectionFormatMessage,
  rejectionSizeMessage,
  descriptionText,
}: FileDropInputProps) {
  const t = useTranslations('fileDrop')
  const resolvedDescription = descriptionText ?? t('description')
  const resolvedRejectionFormat = rejectionFormatMessage ?? t('rejectionFormat')
  const resolvedRejectionSize = rejectionSizeMessage ?? t('rejectionSize')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(existingImageUrl)
  const [rejection, setRejection] = useState<string | null>(null)

  // Revoke the last object URL whenever a new one replaces it, and on unmount,
  // so a form left open doesn't leak blob URLs.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  function selectFile(file: File | null) {
    if (disabled) return
    if (file && !isAccepted(file, accept)) {
      setRejection(resolvedRejectionFormat)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setRejection(resolvedRejectionSize)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setRejection(null)

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    if (file) {
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setPreviewUrl(url)
    } else {
      setPreviewUrl(undefined)
    }

    onFileSelect(file)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingOver(false)
    selectFile(event.dataTransfer.files[0] ?? null)
  }

  function handleRemove() {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    selectFile(null)
  }

  const shownError = errorMessage ?? rejection
  const isInvalid = Boolean(shownError)

  return (
    <div className="file-drop-field">
      <span className="cms-form-field-label" id={`${inputId}-label`}>
        {label}
        {required ? (
          <span aria-hidden="true" className="cms-form-field-required">
            {' '}
            *
          </span>
        ) : null}
      </span>

      {/* The remove button sits beside the drop zone, not inside it: a button nested in another
          control (`role="button"`) is announced and reached ambiguously. CSS places it over the
          preview's corner. */}
      <div className="file-drop-area">
        <div
          aria-disabled={disabled || undefined}
          aria-invalid={isInvalid || undefined}
          aria-labelledby={`${inputId}-label`}
          className={[
            'file-drop',
            isDraggingOver && 'file-drop-active',
            isInvalid && 'file-drop-error',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            if (!disabled) inputRef.current?.click()
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setIsDraggingOver(true)
          }}
          onDrop={handleDrop}
          onKeyDown={(event) => {
            if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
        >
          {previewUrl ? (
            <div className="file-drop-preview-wrap">
              <img
                alt={t('previewAlt', { label: label.toLowerCase() })}
                className="file-drop-preview"
                src={previewUrl}
              />
            </div>
          ) : (
            <div className="file-drop-icon">
              <ImagePlus aria-hidden="true" size={22} strokeWidth={1.6} />
            </div>
          )}

          <div className="file-drop-copy">
            <p>{resolvedDescription}</p>
            {helperText && <p className="file-drop-helper">{helperText}</p>}
          </div>
        </div>

        {previewUrl ? (
          <IconButton
            disabled={disabled}
            className="file-drop-remove"
            icon={<X size={12} strokeWidth={1.8} />}
            label={t('removeLabel')}
            onClick={handleRemove}
          />
        ) : null}
      </div>

      {/* Opened through the drop zone, which is the one keyboard stop: out of the tab order, but
          named by the field's label for assistive technology that lists form fields. */}
      <input
        accept={accept}
        disabled={disabled}
        aria-labelledby={`${inputId}-label`}
        className="sr-only"
        id={inputId}
        tabIndex={-1}
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />
      {shownError ? <p className="form-field-error">{shownError}</p> : null}
    </div>
  )
}
