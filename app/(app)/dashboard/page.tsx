import Link from 'next/link'
import { requireProfile, verifyUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatShortDate, isoDaysAgo, nowHour, todayISO } from '@/lib/fitness/date'
import {
  dashboardStatusLine,
  greetingFor,
  loggingStreak,
  nextMove,
} from '@/lib/fitness/dashboard'
import { BmiStat } from '@/components/bmi-stat'
import { CalorieArc } from './calorie-arc'
import { WeightChart, type WeightPoint } from './weight-chart'

export default async function DashboardPage() {
  const profile = await requireProfile()
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  const today = todayISO()
  const weekAgo = isoDaysAgo(6)
  const chartStart = isoDaysAgo(90)
  const streakStart = isoDaysAgo(60)

  const [mealsRes, weightsRes, gymRes, todayLogRes, streakLogsRes, streakMealsRes] =
    await Promise.all([
    supabase
      .from('meals')
      .select('calories, protein_g, carbs_g, fat_g')
      .eq('user_id', userId)
      .eq('log_date', today),
    supabase
      .from('daily_logs')
      .select('log_date, weight_kg')
      .eq('user_id', userId)
      .gte('log_date', chartStart)
      .not('weight_kg', 'is', null)
      .order('log_date', { ascending: true }),
    supabase
      .from('daily_logs')
      .select('log_date')
      .eq('user_id', userId)
      .eq('went_gym', true)
      .gte('log_date', weekAgo),
    supabase
      .from('daily_logs')
      .select('weight_kg, water_ml, steps, went_gym')
      .eq('user_id', userId)
      .eq('log_date', today)
      .maybeSingle(),
    supabase
      .from('daily_logs')
      .select('log_date, weight_kg, water_ml, steps, went_gym')
      .eq('user_id', userId)
      .gte('log_date', streakStart),
    supabase
      .from('meals')
      .select('log_date')
      .eq('user_id', userId)
      .gte('log_date', streakStart),
  ])

  const meals = mealsRes.data ?? []
  const consumed = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein: acc.protein + Number(m.protein_g ?? 0),
      carbs: acc.carbs + Number(m.carbs_g ?? 0),
      fat: acc.fat + Number(m.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const weightRows = weightsRes.data ?? []
  const chartData: WeightPoint[] = weightRows.map((r) => ({
    date: r.log_date as string,
    label: formatShortDate(r.log_date as string),
    weight: Math.round(Number(r.weight_kg) * 10) / 10,
  }))
  const latestWeight = chartData.at(-1)?.weight ?? null

  const gymThisWeek = gymRes.data?.length ?? 0

  const todayLog = todayLogRes.data
  const waterMl = Number(todayLog?.water_ml ?? 0)
  const waterTarget = profile.water_target_ml ?? 2500

  const calTarget = profile.daily_calorie_target ?? 0

  // --- greeting + status line ---
  const hour = nowHour()
  const greeting = greetingFor(hour)
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  const hasAnyLog =
    meals.length > 0 ||
    waterMl > 0 ||
    todayLog?.weight_kg != null ||
    todayLog?.steps != null ||
    todayLog?.went_gym === true

  const proteinTarget = profile.daily_protein_g ?? 0

  const statusLine = dashboardStatusLine({
    hasAnyLog,
    hour,
    calories: consumed.calories,
    calorieTarget: calTarget,
    protein: consumed.protein,
    proteinTarget,
    water: waterMl,
    waterTarget,
  })

  const move = nextMove({
    hour,
    mealCount: meals.length,
    calories: consumed.calories,
    calorieTarget: calTarget,
    protein: consumed.protein,
    proteinTarget,
    water: waterMl,
    waterTarget,
  })

  // A day counts toward the streak if it has a meal or any daily_logs activity.
  const loggedDates = new Set<string>()
  for (const r of streakMealsRes.data ?? []) {
    loggedDates.add(r.log_date as string)
  }
  for (const r of streakLogsRes.data ?? []) {
    if (
      r.weight_kg != null ||
      Number(r.water_ml ?? 0) > 0 ||
      r.steps != null ||
      r.went_gym === true
    ) {
      loggedDates.add(r.log_date as string)
    }
  }
  const streak = loggingStreak(loggedDates, today)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted">{statusLine}</p>
        {streak >= 2 && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {streak}-day logging streak
          </p>
        )}
      </div>

      {/* Calories — hero arc */}
      <CalorieArc consumed={consumed.calories} target={calTarget} />

      {/* Your next move — one rule-based recommendation */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Your next move
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {move.text}
        </p>
        <Link
          href={move.actionHref}
          className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {move.actionLabel}
        </Link>
      </section>

      {/* Water */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">Water</p>
            <p className="text-3xl font-bold text-foreground">
              {(waterMl / 1000).toFixed(waterMl % 1000 === 0 ? 0 : 1)}
              <span className="text-base font-normal text-muted">
                {' '}
                / {(waterTarget / 1000).toFixed(waterTarget % 1000 === 0 ? 0 : 1)} L
              </span>
            </p>
          </div>
          <Link href="/log/daily" className="text-sm text-accent hover:underline">
            + Add
          </Link>
        </div>
        <ProgressBar value={waterMl} max={waterTarget} />
      </section>

      {/* Macros */}
      <section className="grid grid-cols-3 gap-3">
        <MacroCard
          label="Protein"
          value={Math.round(consumed.protein)}
          target={profile.daily_protein_g ?? 0}
        />
        <MacroCard
          label="Carbs"
          value={Math.round(consumed.carbs)}
          target={profile.daily_carb_g ?? 0}
        />
        <MacroCard
          label="Fat"
          value={Math.round(consumed.fat)}
          target={profile.daily_fat_g ?? 0}
        />
      </section>

      {/* Weight trend */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Weight trend</p>
          {latestWeight != null && (
            <p className="text-sm text-muted">
              Latest{' '}
              <span className="font-semibold text-foreground">
                {latestWeight} kg
              </span>
            </p>
          )}
        </div>
        <WeightChart data={chartData} unit="kg" />
      </section>

      {/* Training + BMI */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">This week&apos;s training</p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {gymThisWeek}
            <span className="text-base font-normal text-muted">
              {' '}
              {gymThisWeek === 1 ? 'session' : 'sessions'}
            </span>
          </p>
        </section>
        {latestWeight != null && profile.height_cm != null && (
          <BmiStat
            heightCm={Number(profile.height_cm)}
            weightKg={latestWeight}
            compact
          />
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/log/meal"
          className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          + Log meal
        </Link>
        <Link
          href="/log/daily"
          className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-accent"
        >
          Daily check-in
        </Link>
        <Link
          href="/measurements"
          className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-accent"
        >
          Measurements
        </Link>
      </div>
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const over = max > 0 && value > max
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-warning' : 'bg-accent'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function MacroCard({
  label,
  value,
  target,
}: {
  label: string
  value: number
  target: number
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mb-2 mt-0.5 text-lg font-semibold text-foreground">
        {value}
        <span className="text-xs font-normal text-muted">/{target}g</span>
      </p>
      <ProgressBar value={value} max={target} />
    </div>
  )
}
