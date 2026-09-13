import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { CountryOption } from '@/app/lib/auth/countries'
import {
  initialRegistrationState,
  registrationMessages,
  type RegistrationAction,
} from '@/app/lib/auth/registration'

import { RegistrationForm } from './RegistrationForm'

const countries: CountryOption[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'ES', name: 'España' },
  { code: 'MX', name: 'México' },
]

const succeed: RegistrationAction = async () => ({ ...initialRegistrationState, status: 'success' })

const typedValues = {
  fullName: 'Ana Pérez Rojas',
  email: 'ana.perez@ucr.ac.cr',
  institution: 'Universidad de Costa Rica',
  countryCode: 'CR',
}

const meta: Meta<typeof RegistrationForm> = {
  component: RegistrationForm,
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof RegistrationForm>

export const Default: Story = {
  args: {
    action: succeed,
    countries,
  },
}

export const WithHeading: Story = {
  args: {
    ...Default.args,
    heading: {
      title: 'Crear cuenta',
      description: 'Se aceptan correos personales o institucionales.',
    },
  },
}

export const MissingFields: Story = {
  args: {
    ...Default.args,
    initialState: {
      status: 'error',
      values: initialRegistrationState.values,
      fieldErrors: {
        fullName: registrationMessages.fullNameRequired,
        email: registrationMessages.emailRequired,
        institution: registrationMessages.institutionRequired,
        countryCode: registrationMessages.countryRequired,
        password: registrationMessages.passwordRequired,
        passwordConfirmation: registrationMessages.confirmationRequired,
      },
      formError: registrationMessages.reviewFields,
    },
  },
}

export const InvalidFormat: Story = {
  args: {
    ...Default.args,
    initialState: {
      status: 'error',
      values: { ...typedValues, email: 'ana.perez' },
      fieldErrors: {
        email: registrationMessages.emailInvalid,
        password: registrationMessages.passwordTooShort,
        passwordConfirmation: registrationMessages.confirmationMismatch,
      },
      formError: registrationMessages.reviewFields,
    },
  },
}

export const DuplicateEmail: Story = {
  args: {
    ...Default.args,
    initialState: {
      status: 'error',
      values: typedValues,
      fieldErrors: { email: registrationMessages.emailTaken },
      formError: registrationMessages.reviewFields,
    },
  },
}

export const Failed: Story = {
  args: {
    ...Default.args,
    initialState: {
      status: 'error',
      values: typedValues,
      fieldErrors: {},
      formError: registrationMessages.unexpected,
    },
  },
}

export const Success: Story = {
  args: {
    ...Default.args,
    initialState: { ...initialRegistrationState, status: 'success' },
  },
}
