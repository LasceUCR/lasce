import { PageSkeleton } from '@/app/components/public/skeleton/PageSkeleton'

// The loading boundary for every public page that has none of its own (#475). Almost every page
// here is `force-dynamic`, and Next neither prefetches such a page nor leaves the current one
// until the server render finishes unless a `loading.tsx` exists, so a click on a slow page used
// to look like a dead link. With this boundary the header stays, the skeleton shows at once and
// the page streams in behind it. `/contacto`, `/galeria` and `/publicaciones` keep their own.
export default function Loading() {
  return <PageSkeleton />
}
