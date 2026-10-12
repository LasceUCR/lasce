import { Toast, type ToastTone } from './Toast'

import styles from './Toast.module.css'

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

export interface ToastRegionProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

/**
 * The fixed stack toasts appear in, split into two live regions: errors are announced
 * assertively, successes politely. Both stay mounted while empty, because a screen reader only
 * announces a change to a live region that already exists, not one inserted with its content.
 */
export function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
  const errors = toasts.filter((toast) => toast.tone === 'error')
  const successes = toasts.filter((toast) => toast.tone === 'success')

  return (
    <div className={styles.viewport}>
      <div aria-live="assertive" className={styles.stack}>
        {errors.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </div>
      <div aria-live="polite" className={styles.stack}>
        {successes.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </div>
    </div>
  )
}
