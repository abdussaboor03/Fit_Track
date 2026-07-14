'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyUser } from '@/lib/auth/dal'
import { parseFoodPreferences } from '@/lib/fitness/preferences'

export type SettingsState = { ok?: boolean; error?: string } | undefined

export async function updateFoodPreferences(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { userId } = await verifyUser()
  const foodPreferences = parseFoodPreferences(formData.get('food_preferences'))

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      food_preferences: foodPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('[updateFoodPreferences] error:', error.message)
    return { error: 'Could not save your preferences. Please try again.' }
  }

  return { ok: true }
}
