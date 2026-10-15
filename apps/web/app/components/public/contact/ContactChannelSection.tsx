'use client'

import { Mail, MapPin, Phone, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  contactCardLink,
  isVisibleContactCard,
  type ContactCard,
  type ContactChannelIcon,
} from '@/app/lib/contact-channel-schema'
import {
  ContactChannelForm,
  type ContactChannelFormHandle,
  type ContactChannelSaveBody,
} from './ContactChannelForm'
import styles from './ContactChannelSection.module.css'

function FacebookIcon() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="20" rx="5" ry="5" width="20" x="2" y="2" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

const lucideIcons: Partial<Record<ContactChannelIcon, LucideIcon>> = {
  phone: Phone,
  location: MapPin,
  email: Mail,
}

function channelIcon(icon: ContactChannelIcon): ReactNode {
  if (icon === 'instagram') return <InstagramIcon />
  if (icon === 'facebook') return <FacebookIcon />
  const Icon = lucideIcons[icon]
  return Icon ? <Icon size={22} strokeWidth={1.8} /> : null
}

function channelBody(card: ContactCard): ReactNode {
  const link = contactCardLink(card.icon, card.description, card.href)
  if (!link) {
    return (
      <p className={styles.description} lang={card.lang}>
        {card.description}
      </p>
    )
  }

  return (
    <p className={styles.description} lang={card.lang}>
      <a
        href={link.href}
        rel={link.external ? 'noreferrer' : undefined}
        target={link.external ? '_blank' : undefined}
      >
        {card.description}
      </a>
    </p>
  )
}

export interface ContactChannelSectionProps {
  title: string
  cards: readonly ContactCard[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function ContactChannelSection({
  title,
  cards,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: ContactChannelSectionProps) {
  const t = useTranslations('contact.cards')
  const { editMode } = useEditMode()
  const router = useRouter()
  const sendWithFeedback = useRequestFeedback()
  const createForm = useRef<ContactChannelFormHandle>(null)
  const editForm = useRef<ContactChannelFormHandle>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const visible = cards.filter(isVisibleContactCard)
  const editing = visible.find((card) => card.id === editingId) ?? null
  const showSection = visible.length > 0 || (editMode && canCreate)

  if (!showSection) return null

  function jsonRequest(method: 'POST' | 'PATCH', body: ContactChannelSaveBody) {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  }

  async function save(
    url: string,
    method: 'POST' | 'PATCH',
    body: ContactChannelSaveBody,
    close: () => void,
  ) {
    await sendWithFeedback(url, jsonRequest(method, body), {
      success: method === 'POST' ? t('created') : t('updated'),
      fallback: t('saveFailed'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
  }

  return (
    <TopicSection
      id="informacion-de-contacto"
      title={title}
      titleId="informacion-de-contacto-titulo"
    >
      <CardGrid columns={3} equalHeight>
        {visible.map((card) => {
          const body = (
            <InfoCard
              description={channelBody(card)}
              icon={channelIcon(card.icon)}
              title={card.title}
            />
          )
          const manageable = editMode && (canEdit || canDelete)

          if (!manageable) return <div key={card.id}>{body}</div>

          return (
            <EditableWrapper
              deleteCancelLabel={t('deleteCancel')}
              deleteConfirmLabel={t('deleteConfirm')}
              deleteConfirmMessage={t('deleteMessage')}
              deleteConfirmTitle={t('deleteTitle')}
              deleteLabel={t('delete', { title: card.title })}
              editLabel={t('edit', { title: card.title })}
              key={card.id}
              onDelete={
                canDelete
                  ? () => {
                      void sendWithFeedback(
                        `/api/contacto/canales/${card.id}`,
                        { method: 'DELETE' },
                        {
                          success: t('deleted'),
                          fallback: t('deleteFailed'),
                          onSuccess: () => router.refresh(),
                        },
                      )
                    }
                  : undefined
              }
              onEdit={canEdit ? () => setEditingId(card.id) : undefined}
            >
              {body}
            </EditableWrapper>
          )
        })}
        {editMode && canCreate ? (
          <AddItemCard
            label={t('add')}
            onRequestClose={(close) => {
              if (createForm.current) createForm.current.requestCancel()
              else close()
            }}
          >
            {({ close }) => (
              <ContactChannelForm
                card={null}
                onCancel={close}
                onSave={(body) => {
                  void save('/api/contacto/canales', 'POST', body, close)
                }}
                ref={createForm}
              />
            )}
          </AddItemCard>
        ) : null}
      </CardGrid>

      <Modal
        onClose={() => {
          if (editForm.current) editForm.current.requestCancel()
          else setEditingId(null)
        }}
        open={editing !== null}
        title={t('editTitle')}
      >
        {editing ? (
          <ContactChannelForm
            card={editing}
            onCancel={() => setEditingId(null)}
            onSave={(body) => {
              void save(`/api/contacto/canales/${editing.id}`, 'PATCH', body, () =>
                setEditingId(null),
              )
            }}
            ref={editForm}
          />
        ) : null}
      </Modal>
    </TopicSection>
  )
}
