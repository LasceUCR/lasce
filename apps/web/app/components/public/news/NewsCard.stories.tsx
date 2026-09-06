import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NewsCard } from './NewsCard'
import { news } from '@/app/lib/news'

const meta: Meta<typeof NewsCard> = {
  component: NewsCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof NewsCard>

const defaultNews = news[0]!

export const Default: Story = {
  args: {
    title: defaultNews.title,
    authors: defaultNews.authors,
    source: defaultNews.source,
    date: defaultNews.date,
    abstract: defaultNews.abstract,
    href: defaultNews.href,
    imageUrl: defaultNews.imageUrl,
  },
}
