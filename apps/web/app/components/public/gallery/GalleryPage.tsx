import { GalleryGroupSection } from './GalleryGroupSection'
import { GalleryAlbumAddCard } from './GalleryAlbumAddCard'
import { getTranslations } from 'next-intl/server'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import type { GalleryAlbum } from '@/app/lib/gallery-schema'

export interface GalleryPageProps {
  albums: readonly GalleryAlbum[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export async function GalleryPage({
  albums,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: GalleryPageProps) {
  const t = await getTranslations('gallery.hero')
  const tcommon = await getTranslations('common')

  return (
    <article className="topic-page">
      <TopicHero kicker={t('kicker')} lead={t('lead')} title={t('title')} />

      <div className="gallery-groups page-width">
        <GalleryAlbumAddCard canCreate={canCreate} />
        {albums.map((album) => (
          <GalleryGroupSection
            album={album}
            key={album.slug}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ))}
      </div>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={tcommon('backToHome')} />
      </div>
    </article>
  )
}
