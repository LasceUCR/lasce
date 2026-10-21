import type { StorybookConfig } from '@storybook/nextjs-vite'

import { dirname } from 'path'

import type { Plugin } from 'vite'

import { fileURLToPath } from 'url'

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}
/**
 * Two things the browser cannot run as written:
 * - Server Actions import Prisma, MinIO and other Node-only code, so every `'use server'` module
 *   is replaced by stubs that resolve to a failure and the form fails gracefully.
 * - Vite rewrites `import x from './x.json' with { type: 'json' }` to the old `assert` syntax,
 *   which current browsers reject. Vite already imports JSON natively, so the attribute is dropped.
 */
function browserSafeModules(): Plugin {
  return {
    name: 'lasce:browser-safe-modules',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.tsx?$/.test(id.split('?')[0])) return null

      if (/^\s*(['"])use server\1/.test(code)) {
        const names = [...code.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => m[1])
        const stubs = names.map(
          (name) =>
            `export async function ${name}() { return { ok: false, error: 'Not available in Storybook.' } }`,
        )
        return { code: stubs.join('\n'), map: null }
      }

      const stripped = code.replace(/\s+with\s*\{\s*type:\s*(['"])json\1\s*\}/g, '')
      return stripped === code ? null : { code: stripped, map: null }
    },
  }
}

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-mcp'),
  ],
  framework: getAbsolutePath('@storybook/nextjs-vite'),
  staticDirs: ['../public'],
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [browserSafeModules(), ...(viteConfig.plugins ?? [])],
  }),
}
export default config
