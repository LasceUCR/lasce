'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Pagination } from '@/app/components/public/Pagination'
import { Select } from '@/app/components/public/Select'
import { SearchBar } from '@/app/components/public/SearchBar'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { Modal } from '@/app/components/public/Modal'
import { Button } from '@/app/components/public/Button'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { sendJson } from '@/app/lib/cms/save'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import { PAGE_SIZE } from '@/app/lib/pagination'
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
import { publicationListingHref } from '@/app/lib/publication-listing'
import type { Publication, ResearchGroup, ReviewConfirmation } from '@/app/lib/publication-schema'
import { parseSearchParam } from '@/app/lib/search-query'

import { PublicationCard } from './PublicationCard'
import { PublicationForm, type PublicationFormHandle } from './PublicationForm'
import { usePublicationEditorLanguage } from './usePublicationEditorLanguage'

export interface PublicationsExplorerProps {
  /**
   * The items on the page shown, already searched, filtered, ordered and cut to the page on the
   * server (`getPublicationsPage`), and in the site's language.
   */
  publications: Publication[]
  /** The search the server applied; `''` for none. */
  query?: string
  /** The research group the server applied. `null` is every group. */
  group?: ResearchGroup | null
  /** The page shown, from 1. */
  page?: number
  /** Matching items across every page. Defaults to the items given. */
  totalItems?: number
  /** Defaults to what `totalItems` fills at `PAGE_SIZE` per page. */
  totalPages?: number
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

/** How long typing has to pause before the search runs. */
export const SEARCH_DELAY_MS = 300

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
  query = '',
  group = null,
  page = 1,
  totalItems = publications.length,
  totalPages = Math.ceil(totalItems / PAGE_SIZE),
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: PublicationsExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()
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
  const heading = useRef<HTMLHeadingElement>(null)
  const shownPage = useRef(page)
  // What is typed in the search box. The URL, and so `query`, follows it once typing pauses.
  const [input, setInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  const [navigating, startNavigation] = useTransition()

  // The URL changed without the box: back or forward, or a link. Show its search in the box,
  // unless the box already says the same (say, with a trailing space still being typed).
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    if (parseSearchParam(input) !== query) setInput(query)
  }

  /** Shows the first page of `next`, keeping the group and replacing the URL instead of adding one. */
  const search = useCallback(
    (next: string) => {
      startNavigation(() => {
        router.replace(publicationListingHref(pathname, { query: next, group }), { scroll: false })
      })
    },
    [group, pathname, router],
  )

  // Searches once typing pauses. The server searches the whole collection, in the language the
  // visitor reads, and a new search starts again from the first page.
  useEffect(() => {
    const next = parseSearchParam(input)
    if (next === query) return

    const timer = setTimeout(() => search(next), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [input, query, search])

  // A new page moves focus to the list's heading, so keyboard and screen reader users start
  // reading the new items instead of staying on the link they followed at the bottom.
  useEffect(() => {
    if (shownPage.current === page) return
    shownPage.current = page
    heading.current?.focus()
  }, [page])

  function selectGroup(value: string) {
    const next = value === '' ? null : (value as ResearchGroup)
    if (next === group) return

    startNavigation(() => {
      router.replace(publicationListingHref(pathname, { query, group: next }), { scroll: false })
    })
  }

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

  function getEmptyMessage() {
    if (group !== null && query !== '') {
      return t('page.emptyGroupAndQuery', { group, query })
    }

    if (group !== null) {
      return t('page.emptyGroup', { group })
    }

    if (query !== '') {
      return t('page.emptyQuery', { query })
    }

    return t('page.empty')
  }

  const hasQuery = query !== ''
  const firstShown = (page - 1) * PAGE_SIZE + 1
  const lastShown = Math.min(page * PAGE_SIZE, totalItems)
  const summary = [
    hasQuery && totalItems > 0 ? t('page.results', { count: totalItems }) : null,
    totalPages <= 1
      ? null
      : firstShown === lastShown
        ? t('page.rangeOne', { position: firstShown, total: totalItems })
        : t('page.range', { from: firstShown, to: lastShown, total: totalItems }),
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section aria-labelledby="publications-title" className="publications page-width">
      <div className="publications-toolbar">
        <SearchBar
          className="publications-search"
          label={t('page.searchLabel')}
          onQueryChange={setInput}
          onSubmit={() => {
            const next = parseSearchParam(input)
            if (next !== query) search(next)
          }}
          placeholder={t('page.searchPlaceholder')}
          query={input}
        />

        <div className="publications-group-filter">
          <Select
            id="publication-research-group"
            label={t('page.groupLabel')}
            onChange={selectGroup}
            options={[
              { value: '', label: t('page.allGroups') },
              { value: 'LASCE', label: 'LASCE' },
              { value: 'ROSAC', label: 'ROSAC' },
            ]}
            value={group ?? ''}
          />
        </div>

        <div aria-label={t('page.countLabel')} aria-live="polite" className="publications-kpi">
          <strong>{totalItems}</strong>
          <span>
            {group
              ? t('page.countInGroup', { count: totalItems, group })
              : t('page.countTotal', { count: totalItems })}
          </span>
        </div>
      </div>

      <h2 id="publications-title" ref={heading} tabIndex={-1}>
        {t('page.recent')}
      </h2>

      <p aria-live="polite" className={summary === '' ? 'sr-only' : 'publications-summary'}>
        {summary}
      </p>

      {publications.length === 0 ? (
        <p className="content-empty" role="status">
          {getEmptyMessage()}
        </p>
      ) : null}

      {/* The add card stays available with nothing listed, so the first publication can be
          created and a search with no results does not hide it. */}
      {publications.length > 0 || (editMode && canCreate) ? (
        <div aria-busy={navigating || undefined} className="publication-list">
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

          {publications.map((publication) => {
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

      <Pagination
        currentPage={page}
        hrefForPage={(target) => publicationListingHref(pathname, { query, group, page: target })}
        label={t('page.paginationLabel')}
        scroll={false}
        totalPages={totalPages}
      />

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
