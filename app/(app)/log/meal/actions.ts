'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyUser } from '@/lib/auth/dal'
import { todayISO } from '@/lib/fitness/date'

export type MealState = { error: string } | undefined

function optionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? '').trim()
  if (raw === '') return null
  const v = Number(raw)
  return Number.isNaN(v) ? null : v
}

export async function saveMeal(
  _prev: MealState,
  formData: FormData,
): Promise<MealState> {
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  const mealName = String(formData.get('meal_name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const mealTime = String(formData.get('meal_time') ?? '').trim()
  const source = formData.get('source') === 'photo' ? 'photo' : 'manual'
  const calories = optionalNumber(formData, 'calories')

  if (!mealName) {
    return { error: 'Please enter a meal name.' }
  }
  if (calories === null || calories < 0) {
    return { error: 'Please enter the calories for this meal.' }
  }

  const { error } = await supabase.from('meals').insert({
    user_id: userId,
    log_date: todayISO(),
    meal_name: mealName,
    meal_time: mealTime || null,
    description: description || null,
    calories,
    protein_g: optionalNumber(formData, 'protein_g'),
    carbs_g: optionalNumber(formData, 'carbs_g'),
    fat_g: optionalNumber(formData, 'fat_g'),
    source,
  })

  if (error) {
    console.error('[saveMeal] error:', error.message)
    return { error: 'Could not save the meal. Please try again.' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
