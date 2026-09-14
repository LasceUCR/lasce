import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { initialLoginState, loginMessages, type LoginAction } from '@/app/lib/auth/login'

import { LoginForm } from './LoginForm'

// A real login redirects on success, so the only state a story can show after
// a submission is a rejection.
const reject: LoginAction = async (_state, formData) => ({
  status: 'error',
  values: { email: String(formData.get('email') ?? '') },
  fieldErrors: {},
  formError: loginMessages.invalidCredentials,
})

const meta: Meta<typeof LoginForm> = {
  component: LoginForm,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof LoginForm>

export const Default: Story = {
  args: {
    action: reject,
  },
}

export const WithNext: Story = {
  args: {
    ...Default.args,
    next: '/datos',
  },
}

export const WithNotice: Story = {
  args: {
    ...Default.args,
    next: '/cuenta',
    notice: loginMessages.authRequired,
  },
}

export const WithHeading: Story = {
  args: {
    ...Default.args,
    heading: {
      title: 'Iniciar sesión',
      description: 'Accede para descargar productos científicos y revisar tu actividad.',
    },
  },
}

export const MissingFields: Story = {
  args: {
    ...Default.args,
    initialState: {
      status: 'error',
      values: { email: '' },
      fieldErrors: {
        email: loginMessages.emailRequired,
        password: loginMessages.passwordRequired,
      },
      formError: loginMessages.reviewFields,
    },
  },
}

export const InvalidCredentials: Story = {
  args: {
    ...Default.args,
    initialState: {
      ...initialLoginState,
      status: 'error',
      values: { email: 'ana.perez@ucr.ac.cr' },
      formError: loginMessages.invalidCredentials,
    },
  },
}

export const Failed: Story = {
  args: {
    ...Default.args,
    initialState: {
      ...initialLoginState,
      status: 'error',
      values: { email: 'ana.perez@ucr.ac.cr' },
      formError: loginMessages.unexpected,
    },
  },
}
