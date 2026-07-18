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
import { WaterTile } from './water-tile'
import { WeightChart, type WeightPoint } from './weight-chart'

const STEP_TARGET = 10000

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

  const stepsToday = todayLog?.steps != null ? Number(todayLog.steps) : null
  const wentGymToday = todayLog?.went_gym === true

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

      {/* Today's essentials — compact, secondary to the Arc */}
      <section className="grid grid-cols-2 gap-3">
        {/* Protein */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-4">
          <TileHead label="Protein">
            <ellipse cx="9" cy="10" rx="5" ry="6" stroke="currentColor" strokeWidth="1.5" />
          </TileHead>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {Math.round(consumed.protein)}
            <span className="text-xs font-normal text-muted"> / {proteinTarget}g</span>
          </p>
          <MiniBar value={consumed.protein} max={proteinTarget} color="bg-success" />
        </div>

        {/* Water (interactive) */}
        <WaterTile logDate={today} initialMl={waterMl} targetMl={waterTarget} />

        {/* Steps */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-4">
          <TileHead label="Steps">
            <path
              d="M2 11l3-4 2.5 4.5L10 4l2 4h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </TileHead>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {stepsToday != null ? stepsToday.toLocaleString() : '—'}
            <span className="text-xs font-normal text-muted">
              {' '}
              / {STEP_TARGET.toLocaleString()}
            </span>
          </p>
          <MiniBar value={stepsToday ?? 0} max={STEP_TARGET} color="bg-accent" />
        </div>

        {/* Training */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-4">
          <TileHead label="Training">
            <path
              d="M4 7v4M6.5 5.5v7M11.5 5.5v7M14 7v4M6.5 9h5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </TileHead>
          {wentGymToday ? (
            <>
              <p className="mt-2 text-lg font-semibold text-foreground">Logged</p>
              <p className="mt-auto pt-2 text-xs text-muted">
                {gymThisWeek} this week
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">Not logged yet</p>
              <Link
                href="/log/daily"
                className="mt-auto pt-2 text-sm font-semibold text-accent hover:underline"
              >
                Add session
              </Link>
            </>
          )}
        </div>
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

      {/* BMI (de-emphasized further in a later step) */}
      {latestWeight != null && profile.height_cm != null && (
        <BmiStat
          heightCm={Number(profile.height_cm)}
          weightKg={latestWeight}
          compact
        />
      )}

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

// Compact tile header: a small line icon (children are SVG paths) + label.
function TileHead({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 text-muted">
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        {children}
      </svg>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
}

function MiniBar({
  value,
  max,
  color,
}: {
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
