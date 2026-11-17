import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import es from '@/messages/es.json' with { type: 'json' }

import { EmailSettingsForm } from './EmailSettingsForm'

const meta: Meta<typeof EmailSettingsForm> = {
  component: EmailSettingsForm,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
  args: {
    title: es.administration.email.title,
    description: es.administration.email.description,
    canStorePassword: true,
    testRecipient: 'admin@ucr.ac.cr',
  },
}

export default meta

type Story = StoryObj<typeof EmailSettingsForm>

export const NotConfigured: Story = {
  args: { settings: null },
}

export const Configured: Story = {
  args: {
    settings: {
      host: 'smtp.ucr.ac.cr',
      port: 587,
      security: 'starttls',
      username: 'lasce',
      fromAddress: 'no-responder@ucr.ac.cr',
      fromName: 'LASCE',
      passwordConfigured: true,
      passwordUnreadable: false,
    },
  },
}

export const WithoutAuthentication: Story = {
  args: {
    settings: {
      host: 'localhost',
      port: 1025,
      security: 'none',
      username: null,
      fromAddress: 'no-responder@lasce.test',
      fromName: 'LASCE',
      passwordConfigured: false,
      passwordUnreadable: false,
    },
  },
}

/** `CRON_SECRET` changed since the password was saved. */
export const PasswordUnreadable: Story = {
  args: {
    settings: {
      ...(Configured.args?.settings as NonNullable<
        NonNullable<typeof Configured.args>['settings']
      >),
      passwordUnreadable: true,
    },
  },
}

/** The server has no `CRON_SECRET`, so it cannot store a password. */
export const KeyUnavailable: Story = {
  args: { settings: null, canStorePassword: false },
}
