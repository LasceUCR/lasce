// The catch-all for unknown public addresses lives in its own route group so that it sits outside
// `(public)/loading.tsx`. Inside that loading boundary the response streams, its 200 status is sent
// before `notFound()` runs, and an unknown address would answer 200 instead of 404. This group
// reuses the public shell, so the not-found page still shows the header and footer.
export { default } from '@/app/(public)/layout'
