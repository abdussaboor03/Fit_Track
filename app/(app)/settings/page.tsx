import Link from 'next/link'
import { requireProfile, verifyUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { FoodPreferences } from '@/lib/fitness/types'
import { SettingsForm, type SettingsInitial } from './settings-form'

export default async function SettingsPage() {
  const profile = await requireProfile()
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  // Current weight lives in daily_logs, not profiles — pull the latest entry.
  const { data: latest } = await supabase
    .from('daily_logs')
    .select('weight_kg')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const initial: SettingsInitial = {
    fullName: profile.full_name ?? '',
    sex: profile.sex ?? '',
    dob: profile.date_of_birth ?? '',
    heightCm: profile.height_cm != null ? Number(profile.height_cm) : null,
    currentWeightKg:
      latest?.weight_kg != null ? Number(latest.weight_kg) : null,
    goalType: profile.goal_type ?? '',
    targetWeightKg:
      profile.target_weight_kg != null ? Number(profile.target_weight_kg) : null,
    rateKgPerWeek:
      profile.target_rate_kg_per_week != null
        ? Number(profile.target_rate_kg_per_week)
        : null,
    activityLevel: profile.activity_level ?? '',
    workoutFrequency: profile.workout_frequency ?? '',
    dietaryRestriction: profile.dietary_restriction ?? '',
    foodPreferences: (profile.food_preferences as FoodPreferences | null) ?? {},
    waterTargetMl: profile.water_target_ml ?? 2500,
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
        Settings
      </h1>
      <p className="mb-6 text-sm text-muted">
        Update your details anytime. Changing your stats or goal recalculates
        your calorie and macro targets.
      </p>

      <SettingsForm initial={initial} />

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Body measurements
            </p>
            <p className="text-xs text-muted">
              Optionally track waist, chest, arms, and more over time.
            </p>
          </div>
          <Link
            href="/measurements"
            className="flex-shrink-0 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent"
          >
            Open
          </Link>
        </div>
      </section>
    </div>
  )
}
