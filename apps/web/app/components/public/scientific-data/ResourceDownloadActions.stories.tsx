import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ResourceDownloadActions } from './ResourceDownloadActions'

const meta: Meta<typeof ResourceDownloadActions> = { component: ResourceDownloadActions }
export default meta
type Story = StoryObj<typeof ResourceDownloadActions>

const png = {
  format: 'png',
  label: 'Descargar gráfica (PNG)',
  kind: 'graphic',
  allowed: true,
} as const
const csv = {
  format: 'csv',
  label: 'Descargar datos (CSV)',
  kind: 'data',
  allowed: true,
} as const

/** A user holding every grant the product needs. */
export const AllAllowed: Story = {
  args: {
    options: [png, csv],
    signedIn: true,
    pendingFormat: null,
    message: null,
    onDownload: () => undefined,
  },
}

/** GOES data without `download_goes_resources`: only the chart image is shown. */
export const GoesDataForbidden: Story = {
  args: { ...AllAllowed.args, options: [png, { ...csv, allowed: false }] },
}

/** An anonymous visitor: the chart image becomes a sign-in prompt; data is not advertised. */
export const SignedOut: Story = {
  args: {
    ...AllAllowed.args,
    options: [
      { ...png, allowed: false },
      { ...csv, allowed: false },
    ],
    signedIn: false,
  },
}

/** Only a chart image is offered (MAG, SEISS). */
export const ImageOnly: Story = { args: { ...AllAllowed.args, options: [png] } }

export const Preparing: Story = { args: { ...AllAllowed.args, pendingFormat: 'csv' } }

export const Ready: Story = {
  args: {
    ...AllAllowed.args,
    message: { tone: 'info', text: 'La descarga comenzó. El enlace vence en 30 minutos.' },
  },
}

export const Failed: Story = {
  args: {
    ...AllAllowed.args,
    message: {
      tone: 'error',
      text: 'No fue posible preparar la descarga. Inténtelo nuevamente más tarde.',
    },
  },
}

/** SUVI and anything else without a download policy. */
export const NothingOffered: Story = { args: { ...AllAllowed.args, options: [] } }
