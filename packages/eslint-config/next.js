import { baseConfig } from './base.js'

/**
 * Config for `apps/web`. Next.js specific rules are layered on top by the app's
 * own `eslint.config.mjs`, which also pulls in `eslint-config-next`.
 * @type {import('eslint').Linter.Config[]}
 */
export const nextConfig = [
  ...baseConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
]

export default nextConfig
