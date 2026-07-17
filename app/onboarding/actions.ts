'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyUser } from '@/lib/auth/dal'
import { ageFromDob, computeTargets } from '@/lib/fitness/calc'
import { parseFoodPreferences } from '@/lib/fitness/preferences'
import { todayISO } from '@/lib/fitness/date'
import type {
  ActivityLevel,
  GoalType,
  Sex,
  WorkoutFrequency,
} from '@/lib/fitness/types'

export type OnboardingState = { error: string } | undefined

const SEXES: Sex[] = ['male', 'female']
const GOALS: GoalType[] = ['lose', 'maintain', 'gain']
const ACTIVITIES: ActivityLevel[] = [
  'sedentary',
  'lightly_active',
  'active',
  'very_active',
]
const FREQUENCIES: WorkoutFrequency[] = ['none', '1-2', '3-4', '5+']

function num(formData: FormData, key: string): number {
  return Number(formData.get(key))
}

export async function saveProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { userId } = await verifyUser()

  const fullName = String(formData.get('full_name') ?? '').trim()
  const sex = String(formData.get('sex') ?? '') as Sex
  const dob = String(formData.get('date_of_birth') ?? '')
  const heightCm = num(formData, 'height_cm')
  const currentWeightKg = num(formData, 'current_weight_kg')
  const goalType = String(formData.get('goal_type') ?? '') as GoalType
  const targetWeightKg = num(formData, 'target_weight_kg')
  const rateKgPerWeek = Math.abs(num(formData, 'target_rate_kg_per_week'))
  const activityLevel = String(formData.get('activity_level') ?? '') as ActivityLevel
  const workoutFrequency = String(
    formData.get('workout_frequency') ?? '',
  ) as WorkoutFrequency
  const dietaryRestriction = String(
    formData.get('dietary_restriction') ?? '',
  ).trim()
  const foodPreferences = parseFoodPreferences(formData.get('food_preferences'))

  // Optional water target — only present from Settings; onboarding leaves the
  // column at its default. Clamp to a sane range when supplied.
  const waterTargetRaw = String(formData.get('water_target_ml') ?? '').trim()
  const waterTargetMl =
    waterTargetRaw === ''
      ? null
      : Math.max(250, Math.min(10000, Math.round(Number(waterTargetRaw))))

  // Validation.
  if (!fullName) return { error: 'Please enter your name.' }
  if (!SEXES.includes(sex)) return { error: 'Please select your sex.' }
  if (!dob) return { error: 'Please enter your date of birth.' }
  if (!(heightCm > 0)) return { error: 'Please enter a valid height.' }
  if (!(currentWeightKg > 0)) return { error: 'Please enter a valid weight.' }
  if (!GOALS.includes(goalType)) return { error: 'Please choose a goal.' }
  if (!(targetWeightKg > 0)) return { error: 'Please enter a target weight.' }
  if (!ACTIVITIES.includes(activityLevel))
    return { error: 'Please choose an activity level.' }
  if (!FREQUENCIES.includes(workoutFrequency))
    return { error: 'Please choose a workout frequency.' }

  const age = ageFromDob(dob)
  if (!(age > 0 && age < 120)) return { error: 'Please check your date of birth.' }

  // Maintain goals have no weekly rate regardless of what was submitted.
  const effectiveRate = goalType === 'maintain' ? 0 : rateKgPerWeek

  const targets = computeTargets({
    sex,
    weightKg: currentWeightKg,
    heightCm,
    age,
    goalType,
    targetWeightKg,
    rateKgPerWeek: effectiveRate,
    activityLevel,
    workoutFrequency,
  })

  const supabase = await createSupabaseServerClient()

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    sex,
    date_of_birth: dob,
    height_cm: heightCm,
    goal_type: goalType,
    target_weight_kg: targetWeightKg,
    target_rate_kg_per_week: effectiveRate,
    activity_level: activityLevel,
    workout_frequency: workoutFrequency,
    dietary_restriction: dietaryRestriction || null,
    food_preferences: foodPreferences,
    // Only overwrite the water target when Settings submitted one.
    ...(waterTargetMl !== null ? { water_target_ml: waterTargetMl } : {}),
    daily_calorie_target: targets.calories,
    daily_protein_g: targets.proteinG,
    daily_carb_g: targets.carbG,
    daily_fat_g: targets.fatG,
    updated_at: new Date().toISOString(),
  })

  if (profileError) {
    console.error('[saveProfile] profile upsert error:', profileError.message)
    return { error: 'Could not save your profile. Please try again.' }
  }

  // Seed today's weight so the dashboard chart and check-in have a starting point.
  const { error: logError } = await supabase.from('daily_logs').upsert(
    {
      user_id: userId,
      log_date: todayISO(),
      weight_kg: currentWeightKg,
    },
    { onConflict: 'user_id,log_date' },
  )

  if (logError) {
    console.error('[saveProfile] daily_log seed error:', logError.message)
    // Non-fatal — the profile saved, so continue to the dashboard.
  }

  redirect('/dashboard')
}
