import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { EMAIL_SETTINGS_ENDPOINT, EMAIL_TEST_ENDPOINT } from '@/app/lib/mail-settings'
import es from '@/messages/es.json' with { type: 'json' }

import { EmailSettingsForm, type EmailSettingsFormProps } from './EmailSettingsForm'
import {
  Configured,
  KeyUnavailable,
  NotConfigured,
  PasswordUnreadable,
  WithoutAuthentication,
} from './EmailSettingsForm.stories'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const copy = es.administration.email
const meta = {
  title: copy.title,
  description: copy.description,
  canStorePassword: true,
  testRecipient: 'admin@ucr.ac.cr',
}
const args = (story: { args?: Partial<EmailSettingsFormProps> }) =>
  ({ ...meta, ...story.args }) as EmailSettingsFormProps

const fetchMock = vi.fn()

function renderForm(props: EmailSettingsFormProps, locale: 'es' | 'en' = 'es') {
  renderWithIntl(
    <ToastProvider>
      <EmailSettingsForm {...props} />
    </ToastProvider>,
    { locale },
  )
  return userEvent.setup()
}

const field = (label: string) => screen.getByLabelText(label, { exact: true })

function answer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('EmailSettingsForm', () => {
  test('says no server is configured and offers no test until one is saved', () => {
    renderForm(args(NotConfigured))

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeInTheDocument()
    expect(screen.getByText(copy.notConfigured)).toBeInTheDocument()
    expect(field(copy.labels.host)).toHaveValue('')
    expect(screen.getByRole('button', { name: copy.test.send })).toBeDisabled()
  })

  test('fills the stored settings, never the password, and says one is stored', () => {
    renderForm(args(Configured))

    expect(field(copy.labels.host)).toHaveValue('smtp.ucr.ac.cr')
    expect(field(copy.labels.port)).toHaveValue('587')
    expect(field(copy.labels.security)).toHaveValue('starttls')
    expect(field(copy.labels.username)).toHaveValue('lasce')
    expect(field(copy.labels.password)).toHaveValue('')
    expect(field(copy.labels.password)).toHaveAccessibleDescription(copy.hints.passwordKeep)
    expect(screen.queryByText(copy.notConfigured)).not.toBeInTheDocument()
  })

  test('asks for the password again when it cannot be decrypted', () => {
    renderForm(args(PasswordUnreadable))
    expect(screen.getByText(copy.passwordUnreadable)).toBeInTheDocument()
  })

  test('warns that no password can be stored without CRON_SECRET', () => {
    renderForm(args(KeyUnavailable))
    expect(screen.getByText(copy.keyUnavailable)).toBeInTheDocument()
  })

  test('shows field errors inline and sends nothing while the form is invalid', async () => {
    const user = renderForm(args(NotConfigured))

    await user.click(screen.getByRole('button', { name: copy.save }))

    expect(field(copy.labels.host)).toHaveAccessibleDescription(copy.validation.hostRequired)
    expect(field(copy.labels.port)).toHaveAttribute('aria-invalid', 'true')
    expect(field(copy.labels.fromAddress)).toHaveAccessibleDescription(
      copy.validation.fromAddressRequired,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('requires a password for a new username', async () => {
    const user = renderForm(args(WithoutAuthentication))

    await user.type(field(copy.labels.username), 'lasce')
    await user.click(screen.getByRole('button', { name: copy.save }))

    expect(field(copy.labels.password)).toHaveAccessibleDescription(
      `${copy.hints.passwordNew} ${copy.validation.passwordRequired}`,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('saves the values, reports success and refreshes the page', async () => {
    fetchMock.mockResolvedValue(answer(200, { changed: ['host'] }))
    const user = renderForm(args(Configured))

    await user.clear(field(copy.labels.host))
    await user.type(field(copy.labels.host), 'mail.ucr.ac.cr')
    await user.type(field(copy.labels.password), 'nueva')
    await user.click(screen.getByRole('button', { name: copy.save }))

    expect(await screen.findByText(copy.saved)).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(EMAIL_SETTINGS_ENDPOINT)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual({
      host: 'mail.ucr.ac.cr',
      port: '587',
      security: 'starttls',
      username: 'lasce',
      password: 'nueva',
      fromAddress: 'no-responder@ucr.ac.cr',
      fromName: 'LASCE',
    })
    expect(router.refresh).toHaveBeenCalled()
    expect(field(copy.labels.password)).toHaveValue('')
  })

  test('shows the reason the server gave when saving fails', async () => {
    fetchMock.mockResolvedValue(answer(409, { error: copy.errors.keyUnavailable }))
    const user = renderForm(args(Configured))

    await user.type(field(copy.labels.password), 'nueva')
    await user.click(screen.getByRole('button', { name: copy.save }))

    expect(await screen.findByText(copy.errors.keyUnavailable)).toBeInTheDocument()
    expect(router.refresh).not.toHaveBeenCalled()
    expect(field(copy.labels.password)).toHaveValue('nueva')
  })

  test('sends a test email to the administrator and reports where it went', async () => {
    fetchMock.mockResolvedValue(answer(200, { sentTo: 'admin@ucr.ac.cr' }))
    const user = renderForm(args(Configured))

    expect(
      screen.getByText(copy.test.body.replace('{email}', 'admin@ucr.ac.cr')),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.test.send }))

    expect(
      await screen.findByText(copy.test.sent.replace('{email}', 'admin@ucr.ac.cr')),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(EMAIL_TEST_ENDPOINT, { method: 'POST' })
  })

  test('reports a failed test with the server reason', async () => {
    fetchMock.mockResolvedValue(answer(502, { error: copy.errors.sendFailed }))
    const user = renderForm(args(Configured))

    await user.click(screen.getByRole('button', { name: copy.test.send }))

    await waitFor(() => expect(screen.getByText(copy.errors.sendFailed)).toBeInTheDocument())
  })

  test('renders in English', () => {
    renderForm(args(Configured), 'en')
    expect(screen.getByLabelText('SMTP server', { exact: true })).toHaveValue('smtp.ucr.ac.cr')
    expect(screen.getByRole('button', { name: 'Send test email' })).toBeEnabled()
  })
})
