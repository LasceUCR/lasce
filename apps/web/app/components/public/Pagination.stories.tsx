import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { listingHref } from '@/app/lib/pagination'

import { Pagination } from './Pagination'

const hrefForPage = (page: number) => listingHref('/noticias', { page })

const meta: Meta<typeof Pagination> = {
  component: Pagination,
  args: { hrefForPage },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', background: 'var(--page)' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof Pagination>

/** The first of three pages: "Anterior" is unavailable. */
export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 3 },
}

/** A page in the middle of a short listing: every page is listed. */
export const MiddlePage: Story = {
  args: { currentPage: 2, totalPages: 3 },
}

/** The last page: "Siguiente" is unavailable. */
export const LastPage: Story = {
  args: { currentPage: 3, totalPages: 3 },
}

/** Many pages: the first, the last and the current page's neighbours, with gaps. */
export const ManyPages: Story = {
  args: { currentPage: 6, totalPages: 12 },
}

/** Everything fits on one page: nothing is rendered. */
export const SinglePage: Story = {
  args: { currentPage: 1, totalPages: 1 },
}

/** With a label of its own for the navigation landmark, as `/noticias` uses it. */
export const CustomLabel: Story = {
  args: { currentPage: 2, totalPages: 5, label: 'Páginas de noticias' },
}

/** On a phone: the numbers give way to "Página 6 de 12" between the arrows. */
export const Mobile: Story = {
  args: { currentPage: 6, totalPages: 12 },
  globals: { viewport: { value: 'paginationMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        paginationMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}

/** In English. */
export const English: Story = {
  args: { currentPage: 6, totalPages: 12 },
  globals: { locale: 'en' },
}
