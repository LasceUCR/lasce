'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState, type KeyboardEvent } from 'react'

import { Button } from '@/app/components/public/Button'
import { IconButton } from '@/app/components/public/IconButton'

/** How many authors show before the list collapses behind "+N más". */
export const VISIBLE_AUTHORS = 3

export interface PublicationAuthorsFieldProps {
  authors: string[]
  onChange: (authors: string[]) => void
  /** The form's error for the list, such as "at least one author". */
  error?: string
  required?: boolean
}

/**
 * The publication's authors as a tag input: one box holding the names as small chips, and below
 * them a quiet text box with an "Agregar" button to add one more. Past `VISIBLE_AUTHORS` the
 * chips collapse behind a "+N más" chip that shows the rest, so a long list does not stretch the
 * form. A name is refused when blank or already in the list, in any case: the same rule as the
 * API.
 */
export function PublicationAuthorsField({
  authors,
  onChange,
  error,
  required = false,
}: PublicationAuthorsFieldProps) {
  const t = useTranslations('publications.authors')
  const id = useId()
  const [name, setName] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const hidden = Math.max(authors.length - VISIBLE_AUTHORS, 0)
  const visible = expanded ? authors : authors.slice(0, VISIBLE_AUTHORS)
  const message = inputError ?? error
  const messageId = `${id}-message`
  const listId = `${id}-list`

  function add() {
    const trimmed = name.trim()

    if (!trimmed) {
      setInputError(t('required'))
      return
    }

    if (authors.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      setInputError(t('duplicate'))
      return
    }

    onChange([...authors, trimmed])
    setName('')
    setInputError(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    // Enter adds the name instead of submitting anything around the form.
    event.preventDefault()
    add()
  }

  return (
    <div
      aria-labelledby={`${id}-label`}
      className="cms-form-field publication-authors"
      role="group"
    >
      <div className="publication-authors-header">
        <span className="cms-form-field-label" id={`${id}-label`}>
          {t('label')}
          {required ? (
            <span aria-hidden="true" className="cms-form-field-required">
              {' '}
              *
            </span>
          ) : null}
        </span>
        <span aria-live="polite" className="publication-authors-count">
          {t('count', { count: authors.length })}
        </span>
      </div>

      <div className={message ? 'publication-authors-box is-invalid' : 'publication-authors-box'}>
        {authors.length > 0 ? (
          <ul
            aria-label={t('list')}
            className={
              expanded ? 'publication-authors-list is-expanded' : 'publication-authors-list'
            }
            id={listId}
          >
            {visible.map((author) => (
              <li className="email-chip" key={author}>
                {author}
                <IconButton
                  className="email-chip-remove"
                  icon={<X size={12} strokeWidth={2} />}
                  label={t('remove', { name: author })}
                  onClick={() => onChange(authors.filter((existing) => existing !== author))}
                />
              </li>
            ))}
            {hidden > 0 ? (
              <li>
                <button
                  aria-controls={listId}
                  aria-expanded={expanded}
                  className="publication-authors-toggle"
                  onClick={() => setExpanded((current) => !current)}
                  type="button"
                >
                  {expanded ? (
                    t('showLess')
                  ) : (
                    <>
                      {t('more', { count: hidden })}
                      <span className="visually-hidden">: {t('showAll')}</span>
                    </>
                  )}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="publication-authors-entry">
          <input
            aria-describedby={message ? messageId : undefined}
            aria-invalid={message ? true : undefined}
            aria-label={t('inputLabel')}
            onChange={(event) => {
              setName(event.target.value)
              setInputError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder={authors.length > 0 ? t('placeholderAnother') : t('placeholder')}
            type="text"
            value={name}
          />
          <Button className="publication-authors-add" onClick={add} variant="secondary">
            {t('add')}
          </Button>
        </div>
      </div>

      {message ? (
        <p className="form-field-error" id={messageId} role={inputError ? 'alert' : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
