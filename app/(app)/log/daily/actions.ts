'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyUser } from '@/lib/auth/dal'
import { todayISO } from '@/lib/fitness/date'

export type DailyState = { error: string } | undefined

export async function saveDailyLog(
  _prev: DailyState,
  formData: FormData,
): Promise<DailyState> {
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  const logDate = String(formData.get('log_date') || todayISO())
  const weightKg = Number(formData.get('weight_kg'))
  const wentGym = formData.get('went_gym') === 'on'
  const stepsRaw = String(formData.get('steps') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!(weightKg > 0)) {
    return { error: 'Please enter your weight.' }
  }

  const { error: logError } = await supabase.from('daily_logs').upsert(
    {
      user_id: userId,
      log_date: logDate,
      weight_kg: weightKg,
      went_gym: wentGym,
      steps: stepsRaw ? Number(stepsRaw) : null,
      notes: notes || null,
    },
    { onConflict: 'user_id,log_date' },
  )

  if (logError) {
    console.error('[saveDailyLog] error:', logError.message)
    return { error: 'Could not save your check-in. Please try again.' }
  }

  // Replace the day's workouts with whatever was submitted (idempotent re-save).
  await supabase
    .from('workouts')
    .delete()
    .eq('user_id', userId)
    .eq('log_date', logDate)

  if (wentGym) {
    const names = formData.getAll('exercise_name').map((v) => String(v).trim())
    const sets = formData.getAll('sets').map((v) => String(v))
    const reps = formData.getAll('reps').map((v) => String(v))
    const weights = formData.getAll('exercise_weight').map((v) => String(v))

    const rows = names
      .map((name, i) => ({
        user_id: userId,
        log_date: logDate,
        exercise_name: name,
        sets: sets[i] ? Number(sets[i]) : null,
        reps: reps[i] ? Number(reps[i]) : null,
        weight_kg: weights[i] ? Number(weights[i]) : null,
      }))
      .filter((r) => r.exercise_name.length > 0)

    if (rows.length > 0) {
      const { error: workoutError } = await supabase.from('workouts').insert(rows)
      if (workoutError) {
        console.error('[saveDailyLog] workouts error:', workoutError.message)
      }
    }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
