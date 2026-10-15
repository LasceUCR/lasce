import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@lasce/db', () => ({
  prisma: {
    contactChannel: {
      findMany: mocks.findMany,
      aggregate: mocks.aggregate,
      create: mocks.create,
      deleteMany: mocks.deleteMany,
    },
    $transaction: (write: (tx: unknown) => Promise<unknown>) =>
      write({
        contactChannel: {
          findUnique: mocks.findUnique,
          updateMany: mocks.updateMany,
          findUniqueOrThrow: mocks.findUniqueOrThrow,
        },
        contactChannelTranslation: { upsert: mocks.upsert },
      }),
  },
}))

import { toVersion } from '@/app/lib/cms/version'

import {
  createContactChannel,
  deleteContactChannel,
  getContactChannels,
  updateContactChannel,
} from './contact-channels'

const updatedAt = new Date('2026-10-12T15:00:00.000Z')
const id = '6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e01'

const content = {
  es: { title: 'Teléfono', description: '2511-6566' },
  en: { title: 'Phone', description: '2511-6566' },
}

function row(icon = 'PHONE', href: string | null = null) {
  return {
    id,
    icon,
    href,
    position: 0,
    title: 'Teléfono',
    description: '2511-6566',
    updatedAt,
    translations: [{ locale: 'en', title: 'Phone', description: '2511-6566' }],
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('contact channels', () => {
  test('reads cards in position order and falls back per card', async () => {
    mocks.findMany.mockResolvedValue([row()])

    const spanish = await getContactChannels('es')
    const english = await getContactChannels('en', true)

    expect(spanish[0]).toMatchObject({ title: 'Teléfono', editing: null, icon: 'phone' })
    expect(english[0]).toMatchObject({
      title: 'Phone',
      description: '2511-6566',
      editing: { version: toVersion(updatedAt) },
    })
    expect(mocks.findMany).toHaveBeenCalledWith({
      orderBy: { position: 'asc' },
      include: {
        translations: { select: { locale: true, title: true, description: true } },
      },
    })
  })

  test('appends a card after the last position and drops a link on a non-social icon', async () => {
    mocks.aggregate.mockResolvedValue({ _max: { position: 1 } })
    mocks.create.mockResolvedValue(row())

    const card = await createContactChannel({ icon: 'phone', href: 'https://example.com', content })

    expect(card.title).toBe('Teléfono')
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ icon: 'PHONE', href: null, position: 2 }),
      }),
    )
  })

  test('rejects an update when the card changed since it was opened', async () => {
    mocks.findUnique.mockResolvedValue({
      ...row(),
      updatedAt: new Date('2026-10-12T16:00:00.000Z'),
    })

    await expect(
      updateContactChannel(id, {
        icon: 'phone',
        href: null,
        content,
        version: toVersion(updatedAt),
      }),
    ).resolves.toEqual({ ok: false, reason: 'conflict' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  test('saves a social link and both languages', async () => {
    const facebook = {
      es: { title: 'Facebook', description: 'LASCE' },
      en: { title: 'Facebook', description: 'LASCE' },
    }
    mocks.findUnique.mockResolvedValue(row())
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.findUniqueOrThrow.mockResolvedValue(row('FACEBOOK', 'https://www.facebook.com/lasce'))

    const result = await updateContactChannel(id, {
      icon: 'facebook',
      href: 'https://www.facebook.com/lasce',
      content: facebook,
      version: toVersion(updatedAt),
    })

    expect(result.ok).toBe(true)
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          icon: 'FACEBOOK',
          href: 'https://www.facebook.com/lasce',
        }),
      }),
    )
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ locale: 'en', title: 'Facebook' }),
      }),
    )
  })

  test('reports how many rows a delete removed', async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 })

    await expect(deleteContactChannel(id)).resolves.toBe(false)
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id } })
  })
})
