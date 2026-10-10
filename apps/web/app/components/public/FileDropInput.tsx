'use client'

import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

import { IconButton } from './IconButton'

export interface FileDropInputProps {
  label: string
  accept?: string
  existingImageUrl?: string
  onFileSelect: (file: File | null) => void
  helperText?: string
  required?: boolean
  errorMessage?: string | null
}

export function FileDropInput({
  label,
  accept = 'image/*',
  existingImageUrl,
  onFileSelect,
  helperText,
  required = false,
  errorMessage,
}: FileDropInputProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(existingImageUrl)

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

  const isInvalid = Boolean(errorMessage)

  return (
    <div className="file-drop-field">
      <span className="cms-form-field-label" id={`${inputId}-label`}>
        {label}
        {required ? <span className="cms-form-field-required"> *</span> : null}
      </span>

      <div
        aria-invalid={isInvalid || undefined}
        aria-labelledby={`${inputId}-label`}
        className={[
          'file-drop',
          isDraggingOver && 'file-drop-active',
          isInvalid && 'file-drop-error',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => inputRef.current?.click()}
        onDragLeave={() => setIsDraggingOver(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDraggingOver(true)
        }}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={0}
      >
        {previewUrl ? (
          <div className="file-drop-preview-wrap">
            <img
              alt={`Vista previa de ${label.toLowerCase()}`}
              className="file-drop-preview"
              src={previewUrl}
            />
            {/* Stops the click here from also bubbling to the drop zone's own
                onClick, which would reopen the file picker instead of just
                removing the current image. */}
            <span onClick={(event) => event.stopPropagation()}>
              <IconButton
                className="file-drop-remove"
                icon={<X size={12} strokeWidth={1.8} />}
                label="Quitar imagen"
                onClick={handleRemove}
              />
            </span>
          </div>
        ) : (
          <div className="file-drop-icon">
            <ImagePlus aria-hidden="true" size={22} strokeWidth={1.6} />
          </div>
        )}

        <div className="file-drop-copy">
          <p>Arrastre una imagen aquí o haga clic para seleccionarla del equipo</p>
          {helperText && <p className="file-drop-helper">{helperText}</p>}
        </div>
      </div>

      <input
        accept={accept}
        className="sr-only"
        id={inputId}
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />
      {errorMessage ? <p className="form-field-error">{errorMessage}</p> : null}
    </div>
  )
}
