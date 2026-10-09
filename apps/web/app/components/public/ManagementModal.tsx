'use client'

import { AlertCircle, CheckCircle2, Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from './Button'
import { Modal } from './Modal'
import { StandardConfirmDialog } from './StandardConfirmDialog'
import styles from './ManagementModal.module.css'

export interface ManagementRecordValues {
  name: string
  role: string
  institution: string
  email?: string
  bio?: string
  hasPhoto: boolean
}

export interface ManagementModalProps {
  open: boolean
  title?: string
  initialValues?: Partial<ManagementRecordValues>
  simulateSaveError?: boolean
  onClose: () => void
  onSave?: (values: ManagementRecordValues) => void
  onDelete?: () => void
}

interface FormFieldIssue {
  id: string
  fieldId: string
  message: string
}

export function ManagementModal({
  open,
  title = 'Gestión de Investigador',
  initialValues,
  simulateSaveError = false,
  onClose,
  onSave,
  onDelete,
}: ManagementModalProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [role, setRole] = useState(initialValues?.role ?? '')
  const [institution, setInstitution] = useState(initialValues?.institution ?? '')
  const [email, setEmail] = useState(initialValues?.email ?? '')
  const [bio, setBio] = useState(initialValues?.bio ?? '')
  const [hasPhoto, setHasPhoto] = useState(initialValues?.hasPhoto ?? false)

  // Validation state
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)

  const isAnyConfirmOpen = confirmSaveOpen || confirmDeleteOpen || confirmDiscardOpen

  const isDirty =
    hasAttemptedSubmit ||
    name !== (initialValues?.name ?? '') ||
    role !== (initialValues?.role ?? '') ||
    institution !== (initialValues?.institution ?? '') ||
    email !== (initialValues?.email ?? '') ||
    bio !== (initialValues?.bio ?? '') ||
    hasPhoto !== (initialValues?.hasPhoto ?? false)

  function resetForm() {
    setName(initialValues?.name ?? '')
    setRole(initialValues?.role ?? '')
    setInstitution(initialValues?.institution ?? '')
    setEmail(initialValues?.email ?? '')
    setBio(initialValues?.bio ?? '')
    setHasPhoto(initialValues?.hasPhoto ?? false)
    setHasAttemptedSubmit(false)
    setSaveErrorMessage(null)
    setSavedSuccessfully(false)
  }

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      resetForm()
      onClose()
    }
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    resetForm()
    onClose()
  }

  // Compute validation issues
  const issues: FormFieldIssue[] = []
  if (!hasPhoto) {
    issues.push({
      id: 'photo',
      fieldId: 'mgmt-photo',
      message: 'Debe cargar una fotografía del investigador.',
    })
  }
  if (!name.trim()) {
    issues.push({
      id: 'name',
      fieldId: 'mgmt-name',
      message: 'El nombre es obligatorio.',
    })
  }
  if (!role.trim()) {
    issues.push({
      id: 'role',
      fieldId: 'mgmt-role',
      message: 'Debe especificar el rol o cargo.',
    })
  }
  if (!institution.trim()) {
    issues.push({
      id: 'institution',
      fieldId: 'mgmt-institution',
      message: 'La institución o afiliación es obligatoria.',
    })
  }
  if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    issues.push({
      id: 'email-format',
      fieldId: 'mgmt-email',
      message: 'El correo electrónico ingresado no tiene un formato válido.',
    })
  }

  const isFormValid = issues.length === 0

  function handleFieldFocus(fieldId: string) {
    const el = document.getElementById(fieldId)
    if (el) {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      if (typeof el.focus === 'function') {
        el.focus()
      }
    }
  }

  function handleSaveClick() {
    setHasAttemptedSubmit(true)
    if (!isFormValid) {
      const firstIssue = issues[0]
      if (firstIssue) {
        handleFieldFocus(firstIssue.fieldId)
      }
      return
    }

    setSaveErrorMessage(null)
    setConfirmSaveOpen(true)
  }

  async function handleConfirmSave() {
    setIsSubmitting(true)
    setSaveErrorMessage(null)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (simulateSaveError) {
      setIsSubmitting(false)
      setSaveErrorMessage('No se pudieron guardar los cambios. Por favor, intente de nuevo.')
      return
    }

    setIsSubmitting(false)
    setConfirmSaveOpen(false)
    setSavedSuccessfully(true)

    onSave?.({
      name,
      role,
      institution,
      email,
      bio,
      hasPhoto,
    })
  }

  async function handleConfirmDelete() {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsSubmitting(false)
    setConfirmDeleteOpen(false)
    onDelete?.()
    onClose()
  }

  const nameError = hasAttemptedSubmit && issues.find((i) => i.id === 'name')
  const roleError = hasAttemptedSubmit && issues.find((i) => i.id === 'role')
  const institutionError = hasAttemptedSubmit && issues.find((i) => i.id === 'institution')
  const photoError = hasAttemptedSubmit && issues.find((i) => i.id === 'photo')
  const emailError = hasAttemptedSubmit && issues.find((i) => i.id === 'email-format')

  return (
    <>
      <Modal
        onClose={handleCancelClick}
        open={open && !isAnyConfirmOpen}
        size="medium"
        title={title}
      >
        <div className={styles.container}>
          {savedSuccessfully ? (
            <div className={styles.successNotice} role="status">
              <CheckCircle2 aria-hidden="true" size={20} />
              <span>
                <strong>¡Cambios guardados con éxito!</strong> El registro fue actualizado en el
                sistema.
              </span>
            </div>
          ) : null}

          <div className={styles.formGrid}>
            {/* Foto uploader */}
            <div className={styles.fieldGroup}>
              <span className={styles.label}>
                Fotografía del investigador <span className={styles.requiredStar}>*</span>
              </span>

              {hasPhoto ? (
                <div className={styles.photoPreview}>
                  <ImageIcon aria-hidden="true" size={20} />
                  <span className={styles.photoBadge}>investigador_perfil.jpg (cargado)</span>
                  <button
                    className={styles.removePhotoBtn}
                    onClick={() => setHasPhoto(false)}
                    type="button"
                  >
                    Quitar foto
                  </button>
                </div>
              ) : (
                <button
                  aria-invalid={photoError ? 'true' : undefined}
                  className={`${styles.photoUploadBox} ${
                    photoError ? styles.photoUploadBoxError : ''
                  }`}
                  id="mgmt-photo"
                  onClick={() => setHasPhoto(true)}
                  type="button"
                >
                  <Upload aria-hidden="true" size={24} />
                  <span className={styles.photoUploadText}>
                    Haga clic aquí para seleccionar o soltar una imagen
                  </span>
                  <span className={styles.photoUploadHint}>PNG o JPEG (máx. 2MB)</span>
                </button>
              )}
              {photoError ? (
                <p className={styles.fieldErrorText} role="alert">
                  <AlertCircle aria-hidden="true" size={14} />
                  <span>{photoError.message}</span>
                </p>
              ) : null}
            </div>

            {/* Nombre */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="mgmt-name">
                Nombre completo <span className={styles.requiredStar}>*</span>
              </label>
              <input
                aria-invalid={nameError ? 'true' : undefined}
                aria-required="true"
                className={`${styles.input} ${nameError ? styles.inputError : ''}`}
                id="mgmt-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Dra. Carolina Salas"
                type="text"
                value={name}
              />
              {nameError ? (
                <p className={styles.fieldErrorText} role="alert">
                  <AlertCircle aria-hidden="true" size={14} />
                  <span>{nameError.message}</span>
                </p>
              ) : null}
            </div>

            {/* Rol */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="mgmt-role">
                Rol o especialidad <span className={styles.requiredStar}>*</span>
              </label>
              <input
                aria-invalid={roleError ? 'true' : undefined}
                aria-required="true"
                className={`${styles.input} ${roleError ? styles.inputError : ''}`}
                id="mgmt-role"
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ej. Astrofísica Solar e Investigadora Principal"
                type="text"
                value={role}
              />
              {roleError ? (
                <p className={styles.fieldErrorText} role="alert">
                  <AlertCircle aria-hidden="true" size={14} />
                  <span>{roleError.message}</span>
                </p>
              ) : null}
            </div>

            {/* Institución */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="mgmt-institution">
                Institución o afiliación <span className={styles.requiredStar}>*</span>
              </label>
              <input
                aria-invalid={institutionError ? 'true' : undefined}
                aria-required="true"
                className={`${styles.input} ${institutionError ? styles.inputError : ''}`}
                id="mgmt-institution"
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ej. Escuela de Física, Universidad de Costa Rica"
                type="text"
                value={institution}
              />
              {institutionError ? (
                <p className={styles.fieldErrorText} role="alert">
                  <AlertCircle aria-hidden="true" size={14} />
                  <span>{institutionError.message}</span>
                </p>
              ) : null}
            </div>

            {/* Correo */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="mgmt-email">
                Correo electrónico institucional (opcional)
              </label>
              <input
                aria-invalid={emailError ? 'true' : undefined}
                className={`${styles.input} ${emailError ? styles.inputError : ''}`}
                id="mgmt-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@ucr.ac.cr"
                type="email"
                value={email}
              />
              {emailError ? (
                <p className={styles.fieldErrorText} role="alert">
                  <AlertCircle aria-hidden="true" size={14} />
                  <span>{emailError.message}</span>
                </p>
              ) : null}
            </div>

            {/* Biografía */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="mgmt-bio">
                Descripción / Líneas de trabajo (opcional)
              </label>
              <textarea
                className={styles.textarea}
                id="mgmt-bio"
                onChange={(e) => setBio(e.target.value)}
                placeholder="Resumen del trabajo de investigación y contribuciones..."
                rows={3}
                value={bio}
              />
            </div>
          </div>

          {/* Barra de acciones */}
          <div className={styles.actionsBar}>
            <Button
              icon={<Trash2 aria-hidden="true" size={16} />}
              onClick={() => setConfirmDeleteOpen(true)}
              variant="danger"
            >
              Eliminar registro
            </Button>

            <div className={styles.rightActions}>
              <Button onClick={handleCancelClick} variant="secondary">
                Cancelar
              </Button>
              <Button onClick={handleSaveClick} variant="primary">
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación estándar para Guardar */}
      <StandardConfirmDialog
        consequence="Los cambios se aplicarán de inmediato en el catálogo público de investigadores de la UCR."
        errorMessage={saveErrorMessage}
        isSubmitting={isSubmitting}
        message="¿Desea guardar y publicar los cambios en este perfil de investigador?"
        onCancel={() => setConfirmSaveOpen(false)}
        onConfirm={handleConfirmSave}
        open={confirmSaveOpen}
        severity="info"
        submittingLabel="Guardando cambios..."
        targetEntity={name.trim() || 'Nuevo investigador'}
        title="Confirmar guardado de cambios"
      />

      {/* Modal de confirmación estándar destructivo para Eliminar */}
      <StandardConfirmDialog
        confirmLabel="Sí, eliminar investigador"
        isSubmitting={isSubmitting}
        message="Esta acción no se puede deshacer y desvinculará sus proyectos y publicaciones asociadas."
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        open={confirmDeleteOpen}
        severity="danger"
        submittingLabel="Eliminando..."
        title="Confirmar eliminación"
      />

      {/* Modal de confirmación estándar para Descartar cambios */}
      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados."
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title="Descartar cambios no guardados"
      />
    </>
  )
}
