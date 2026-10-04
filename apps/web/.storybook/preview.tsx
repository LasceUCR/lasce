import type { Preview } from '@storybook/nextjs-vite'
import { NextIntlClientProvider } from 'next-intl'

import { defaultLocale, localeLabels, locales, timeZone } from '../app/lib/i18n/config'
import { resolveLocale } from '../app/lib/i18n/locale'
import { getMessages } from '../app/lib/i18n/messages'
import '../app/globals.css'

const preview: Preview = {
  // The toolbar's language menu. Every story renders inside the provider below, so a component
  // that calls `useTranslations` needs no decorator of its own.
  globalTypes: {
    locale: {
      description: 'Idioma',
      toolbar: {
        icon: 'globe',
        items: locales.map((locale) => ({ value: locale, title: localeLabels[locale] })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: defaultLocale },
  decorators: [
    (Story, context) => {
      const locale = resolveLocale(context.globals.locale)

      return (
        <NextIntlClientProvider locale={locale} messages={getMessages(locale)} timeZone={timeZone}>
          <Story />
        </NextIntlClientProvider>
      )
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
}

export default preview
