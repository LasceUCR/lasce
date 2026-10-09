import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { FormField } from '@/app/components/public/FormField'
import { localeLabels, type Locale } from '@/app/lib/i18n/config'

import { LanguageTabs, type LanguageTabsProps } from './LanguageTabs'

const meta: Meta<typeof LanguageTabs> = {
  component: LanguageTabs,
}

export default meta

type Story = StoryObj<typeof LanguageTabs>

/** A fictitious event's name in each language: the tabs know nothing about the fields inside. */
const names: Record<Locale, string> = { es: 'Taller de radioastronomía', en: '' }

function eventFields(locale: Locale) {
  return (
    <FormField
      id={`story-${locale}-name`}
      label={`Nombre (${localeLabels[locale]})`}
      onChange={() => {}}
      required
      value={names[locale]}
    />
  )
}

function InteractiveLanguageTabs(props: LanguageTabsProps) {
  const [selected, setSelected] = useState(props.selected)
  return (
    <LanguageTabs
      {...props}
      onSelect={(locale) => {
        setSelected(locale)
        props.onSelect(locale)
      }}
      selected={selected}
    />
  )
}

export const Spanish: Story = {
  args: {
    selected: 'es',
    onSelect: () => {},
    children: eventFields,
  },
  render: (args) => <InteractiveLanguageTabs {...args} />,
}

/** A record with no English text yet, and a problem waiting on the hidden tab. */
export const WithFlags: Story = {
  args: {
    selected: 'es',
    onSelect: () => {},
    flags: { en: '2 por revisar' },
    children: eventFields,
  },
  render: (args) => <InteractiveLanguageTabs {...args} />,
}

export const EnglishSelected: Story = {
  args: {
    selected: 'en',
    onSelect: () => {},
    flags: { en: 'Sin traducción' },
    children: eventFields,
  },
  render: (args) => <InteractiveLanguageTabs {...args} />,
}
