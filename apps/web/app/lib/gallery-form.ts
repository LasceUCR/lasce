import {
  accessFailure,
  invalidBodyFailure,
  parseApiError,
  reviewRequiredFailure,
  unexpectedFailure,
  withoutServerText,
  type ApiError,
  type SaveFailure,
} from '@/app/lib/cms/save'
import { defaultLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import { isContentPath } from '@/app/lib/i18n/content/form'
import { contentCopy } from '@/app/lib/i18n/content/messages'
import es from '@/messages/es.json' with { type: 'json' }

import {
  publicationContent,
  publicationFieldSchemas,
  type PublicationFieldMessages,
} from './publication-schema'

export { SAVE_ERROR_MESSAGE, type SaveFailure } from '@/app/lib/cms/save'
export {
  contentPath,
  errorsByLocale,
  resetConfirmations,
  type FormErrors,
} from '@/app/lib/i18n/content/form'

/** The texts of a failed save, from the `publications.saveErrors` namespace: plain text. */
export type PublicationSaveMessages = typeof es.publications.saveErrors

/**
 * The language the editor is shown in, which is the site's (the header's selector), and what it
 * says in it. The API speaks Spanish; an editor in another language applies the same rules with
 * its own messages, and shows its own text instead of the server's.
 */
export interface EditorLanguage {
  uiLocale: Locale
  /** The shared fields' rules, with their messages in `uiLocale`. */
  fieldSchemas: ReturnType<typeof publicationFieldSchemas>
  saveErrors: PublicationSaveMessages
}

/**
 * The editor in `uiLocale`, from its `publications.validation` and `publications.saveErrors`
 * messages (plain text: read them with `t.raw`).
 */
export function editorLanguage(
  uiLocale: Locale,
  messages: { validation: PublicationFieldMessages; saveErrors: PublicationSaveMessages },
): EditorLanguage {
  return {
    uiLocale,
    fieldSchemas: publicationFieldSchemas(messages.validation),
    saveErrors: messages.saveErrors,
  }
}

/** The editor in Spanish, the source language: the default of the functions below. */
export const SPANISH_EDITOR: EditorLanguage = editorLanguage(defaultLocale, es.publications)

/** Each language's name, as the tabs and the field labels show it. */
export const languageLabels: Record<Locale, string> = localeLabels

/** The answer's error, with the server's Spanish texts only when the editor is in Spanish too. */
function readError(body: unknown, language: EditorLanguage): ApiError {
  const error = parseApiError(body)
  return language.uiLocale === defaultLocale ? error : withoutServerText(error)
}

const sharedFormFields = new Set(['authors', 'venue', 'date', 'href', 'DOI', 'researchGroup'])

/** True for a path the form shows a message under. */
export function isFormField(path: string): boolean {
  return sharedFormFields.has(path) || isContentPath(publicationContent, path)
}

/** Turns an error response of `/api/publicaciones` into what the editor shows, in its language. */
export function describeSaveFailure(
  status: number,
  body: unknown,
  language: EditorLanguage = SPANISH_EDITOR,
): SaveFailure {
  const error = readError(body, language)
  const messages = language.saveErrors
  const { code, message: serverMessage } = error

  if (code === 'invalid-body') return invalidBodyFailure(error, isFormField, messages)
  if (code === 'review-required') {
    return reviewRequiredFailure(error, contentCopy[language.uiLocale].fieldPending, messages)
  }

  if (code === 'duplicate-doi' || code === 'duplicate-external-url') {
    const doi = code === 'duplicate-doi'
    return {
      message: messages.fields,
      fieldErrors: {
        [doi ? 'DOI' : 'href']:
          serverMessage ?? (doi ? messages.duplicateDoi : messages.duplicateLink),
      },
      reopen: false,
    }
  }

  if (status === 409) return { message: messages.conflict, fieldErrors: {}, reopen: true }
  if (status === 404) return { message: messages.notFound, fieldErrors: {}, reopen: true }

  return accessFailure(status, error, messages) ?? unexpectedFailure(error, messages)
}
