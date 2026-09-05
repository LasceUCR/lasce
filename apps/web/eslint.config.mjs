import storybook from 'eslint-plugin-storybook'

import nextConfig from '@lasce/eslint-config/next'

export default [
  ...nextConfig,
  ...storybook.configs['flat/recommended'],
  {
    ignores: ['storybook-static/**'],
  },
]
