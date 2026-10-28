import { AlbumPageSkeleton } from '@/app/components/public/gallery/AlbumPageSkeleton'

// A sub-album page never lists children of its own (see `[subalbum]/page.tsx`).
export default function Loading() {
  return <AlbumPageSkeleton hasSubAlbums={false} />
}
