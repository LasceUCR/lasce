'use server'

import { redirect } from 'next/navigation'

import { deleteCurrentSession } from '@/app/lib/auth/session'

/**
 * Ends the request's session and sends the browser home. The redirect lives
 * here on purpose: an action that only cleared cookies would make Next
 * re-render the current route, and on `/cuenta` that re-render would run
 * `requireUser` and bounce the visitor who just signed out to the login
 * notice. The same export serves the `/cuenta` form, which works without
 * JavaScript, and the header's sign-out button.
 */
export async function logoutUser(): Promise<void> {
  await deleteCurrentSession()
  redirect('/')
}
