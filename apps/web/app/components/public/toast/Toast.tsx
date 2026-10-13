'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { IconButton } from '@/app/components/public/IconButton'

import styles from './Toast.module.css'

export type ToastTone = 'success' | 'error'

export interface ToastProps {
  tone: ToastTone
  message: string
  onDismiss: () => void
}

/**
 * One notification in a `ToastRegion`. Presentational: what to say and when to dismiss come from
 * `ToastProvider`. The live region it sits in is what announces it, so it carries no role itself.
 */
export function Toast({ tone, message, onDismiss }: ToastProps) {
  const t = useTranslations('common.toast')
  const Icon = tone === 'success' ? CircleCheck : CircleAlert

  return (
    <div className={`${styles.toast} ${tone === 'error' ? styles.error : styles.success}`}>
      <Icon aria-hidden="true" className={styles.icon} size={20} strokeWidth={1.8} />
      <p className={styles.message}>{message}</p>
      <IconButton
        className={styles.dismiss}
        icon={<X size={16} strokeWidth={1.8} />}
        label={t('dismiss')}
        onClick={onDismiss}
      />
    </div>
  )
}
