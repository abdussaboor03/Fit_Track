import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/fitness/types'

export type UserSession = {
  userId: string
  email: string | null
}

/**
 * Confirms there is an authenticated Supabase user. Redirects to /login
 * otherwise. Cached per request so multiple callers share one auth check.
 */
export const verifyUser = cache(async (): Promise<UserSession> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return { userId: user.id, email: user.email ?? null }
})

/**
 * Returns the current user's profile row, or null if onboarding is incomplete.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  return (data as Profile | null) ?? null
})

/**
 * Guards pages that need a completed profile. Redirects to /onboarding when
 * the user has not finished setup yet.
 */
export const requireProfile = cache(async (): Promise<Profile> => {
  const profile = await getProfile()
  if (!profile || profile.daily_calorie_target === null) {
    redirect('/onboarding')
  }
  return profile
})
