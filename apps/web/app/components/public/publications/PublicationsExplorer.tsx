'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicationCard } from './PublicationCard'
import { Select } from '@/app/components/public/Select'
import { SearchBar } from '@/app/components/public/SearchBar'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { Publication, ResearchGroup } from '@/app/lib/publications'
import { Modal } from '@/app/components/public/Modal'
import { Button } from '@/app/components/public/Button'
import { PublicationForm, type PublicationFormHandle } from './PublicationForm'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { sendJson } from '@/app/lib/cms/save'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import {
  buildCreateRequest,
  buildUpdateRequest,
  describeDeleteFailure,
  describeSaveFailure,
  emptyInitial,
  initialFromPublication,
  type EditorLanguage,
  type PublicationDraft,
  type PublicationFormInitial,
  type SaveFailure,
} from '@/app/lib/publication-form'
import type { ReviewConfirmation } from '@/app/lib/publication-schema'

import { usePublicationEditorLanguage } from './usePublicationEditorLanguage'

export interface PublicationsExplorerProps {
  publications: Publication[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

/** Sends a JSON request and reads the failure, if any, the way the editor shows it. */
async function send(
  url: string,
  method: 'POST' | 'PATCH',
  body: unknown,
  language: EditorLanguage,
): Promise<SaveFailure | null> {
  const result = await sendJson(url, method, body)

  if (result.ok) return null
  if (result.status === 0) {
    return { message: language.saveErrors.generic, fieldErrors: {}, reopen: false }
  }

  return describeSaveFailure(result.status, result.body, language)
}

interface Editing {
  publication: Publication
  /** Taken when the editor opened, so a refresh behind it cannot change what it saves against. */
  initial: PublicationFormInitial
}

export function PublicationsExplorer({
  publications,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: PublicationsExplorerProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  // The editing controls and messages follow the site's language.
  const t = useTranslations('publications')
  const toast = useToast()
  const language = usePublicationEditorLanguage()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null)
  const [createFailure, setCreateFailure] = useState<SaveFailure | null>(null)
  const [createInitial, setCreateInitial] = useState<PublicationFormInitial>(() => emptyInitial())

  // One save at a time: a second click while the first request is in flight would send the same
  // version again and come back as a false conflict.
  const saving = useRef(false)

  // The open forms, so the modal's close button and Escape ask before discarding their changes.
  const createForm = useRef<PublicationFormHandle>(null)
  const editForm = useRef<PublicationFormHandle>(null)

  const [query, setQuery] = useState('')

  const [selectedGroup, setSelectedGroup] = useState<ResearchGroup | null>(null)

  function openEditor(publication: Publication) {
    setSaveFailure(null)
    setEditing({ publication, initial: initialFromPublication(publication) })
  }

  function closeEditor() {
    setSaveFailure(null)
    setEditing(null)
  }

  async function handleSavePublication(draft: PublicationDraft, confirmed: ReviewConfirmation[]) {
    if (!editing) return

    const body = buildUpdateRequest(editing.initial, draft, confirmed)
    if (!body) {
      closeEditor()
      return
    }

    if (saving.current) return
    saving.current = true
    const failure = await send(
      `/api/publicaciones/${editing.publication.slug}`,
      'PATCH',
      body,
      language,
    )
    saving.current = false
    if (failure) {
      setSaveFailure(failure)
      toast.show('error', failure.message)
      return
    }

    toast.show('success', t('editor.updated'))
    closeEditor()
    router.refresh()
  }

  async function handleCreatePublication(draft: PublicationDraft, close: () => void) {
    if (saving.current) return
    saving.current = true
    setCreateFailure(null)

    const failure = await send('/api/publicaciones', 'POST', buildCreateRequest(draft), language)
    saving.current = false
    if (failure) {
      setCreateFailure(failure)
      toast.show('error', failure.message)
      return
    }

    toast.show('success', t('editor.created'))
    setCreateInitial(emptyInitial())
    close()
    router.refresh()
  }

  async function handleDeletePublication(id: string) {
    const result = await sendJson(`/api/publicaciones/${id}`, 'DELETE')

    if (!result.ok) {
      toast.show('error', describeDeleteFailure(result.status, result.body, language))
      return
    }

    toast.show('success', t('editor.deleted'))
    router.refresh()
  }

  const filtered = useMemo(() => {
    return publications.filter((publication) => {
      const matchesGroup = selectedGroup === null || publication.researchGroup === selectedGroup

      const matchesSearch =
        query.trim() === '' ||
        matches(publication.title, query) ||
        publication.authors.some((author) => matches(author, query)) ||
        matches(publication.abstract, query)

      return matchesGroup && matchesSearch
    })
  }, [publications, query, selectedGroup])

  function getEmptyMessage() {
    if (selectedGroup !== null && query.trim() !== '') {
      return t('page.emptyGroupAndQuery', { group: selectedGroup, query })
    }

    if (selectedGroup !== null) {
      return t('page.emptyGroup', { group: selectedGroup })
    }

    if (query.trim() !== '') {
      return t('page.emptyQuery', { query })
    }

    return t('page.empty')
  }

  return (
    <section aria-labelledby="publications-title" className="publications page-width">
      <div className="publications-toolbar">
        <SearchBar
          className="publications-search"
          label={t('page.searchLabel')}
          onQueryChange={setQuery}
          placeholder={t('page.searchPlaceholder')}
          query={query}
        />

        <div className="publications-group-filter">
          <Select
            id="publication-research-group"
            label={t('page.groupLabel')}
            onChange={(value) => setSelectedGroup(value === '' ? null : (value as ResearchGroup))}
            options={[
              { value: '', label: t('page.allGroups') },
              { value: 'LASCE', label: 'LASCE' },
              { value: 'ROSAC', label: 'ROSAC' },
            ]}
            value={selectedGroup ?? ''}
          />
        </div>

        <div aria-label={t('page.countLabel')} aria-live="polite" className="publications-kpi">
          <strong>{filtered.length}</strong>
          <span>
            {selectedGroup
              ? t('page.countInGroup', { count: filtered.length, group: selectedGroup })
              : t('page.countTotal', { count: filtered.length })}
          </span>
        </div>
      </div>

      <h2 id="publications-title">{t('page.recent')}</h2>

      {filtered.length === 0 ? (
        <p className="content-empty" role="status">
          {getEmptyMessage()}
        </p>
      ) : null}

      {/* The add card stays available with nothing listed, so the first publication can be
          created and a search with no results does not hide it. */}
      {filtered.length > 0 || (editMode && canCreate) ? (
        <div className="publication-list">
          {editMode && canCreate ? (
            <AddItemCard
              label={t('editor.addCard')}
              size="large"
              onRequestClose={(close) => {
                if (createForm.current) createForm.current.requestCancel()
                else close()
              }}
            >
              {({ close }) => (
                <PublicationForm
                  initial={createInitial}
                  onCancel={() => {
                    setCreateFailure(null)
                    close()
                  }}
                  onSave={(draft) => handleCreatePublication(draft, close)}
                  ref={createForm}
                  serverErrors={createFailure?.fieldErrors}
                />
              )}
            </AddItemCard>
          ) : null}

          {filtered.map((publication) => {
            const card = (
              <PublicationCard
                abstract={publication.abstract}
                authors={publication.authors.join(', ')}
                contentLang={contentLangAttribute(publication.contentLocale)}
                href={publication.href}
                key={publication.slug}
                researchGroup={publication.researchGroup}
                title={publication.title}
                translationMissing={editMode && publication.editing?.isLegacy === true}
                venue={publication.venue}
                year={publication.year}
              />
            )

            const showEditor = editMode && (canEdit || canDelete)
            if (!showEditor) return card

            return (
              <EditableWrapper
                key={publication.slug}
                deleteCancelLabel={t('deleteDialog.cancel')}
                deleteConfirmLabel={t('deleteDialog.confirm')}
                deleteConfirmMessage={t('deleteDialog.message')}
                deleteConfirmTitle={t('deleteDialog.title')}
                deleteLabel={t('editor.deleteLabel', { title: publication.title })}
                editLabel={t('editor.editLabel', { title: publication.title })}
                onDelete={canDelete ? () => handleDeletePublication(publication.slug) : undefined}
                onEdit={canEdit ? () => openEditor(publication) : undefined}
              >
                {card}
              </EditableWrapper>
            )
          })}
        </div>
      ) : null}

      <Modal
        onClose={() => {
          if (editForm.current) editForm.current.requestCancel()
          else closeEditor()
        }}
        open={editing !== null}
        size="large"
        title={t('editor.editTitle')}
      >
        {editing ? (
          <>
            {saveFailure?.reopen ? (
              <Button
                onClick={() => {
                  closeEditor()
                  router.refresh()
                }}
                variant="secondary"
              >
                {t('editor.reload')}
              </Button>
            ) : null}

            <PublicationForm
              initial={editing.initial}
              onCancel={closeEditor}
              onSave={handleSavePublication}
              ref={editForm}
              serverErrors={saveFailure?.fieldErrors}
            />
          </>
        ) : null}
      </Modal>
    </section>
  )
}
