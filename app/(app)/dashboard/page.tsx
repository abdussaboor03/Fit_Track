import Link from 'next/link'
import { requireProfile, verifyUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatShortDate, isoDaysAgo, todayISO } from '@/lib/fitness/date'
import { BmiStat } from '@/components/bmi-stat'
import { WeightChart, type WeightPoint } from './weight-chart'

export default async function DashboardPage() {
  const profile = await requireProfile()
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  const today = todayISO()
  const weekAgo = isoDaysAgo(6)
  const chartStart = isoDaysAgo(90)

  const [mealsRes, weightsRes, gymRes] = await Promise.all([
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

  const calTarget = profile.daily_calorie_target ?? 0
  const calLeft = Math.max(0, calTarget - consumed.calories)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Hi {profile.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-sm text-muted">Here&apos;s your day so far.</p>
      </div>

      {/* Calories */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">Calories</p>
            <p className="text-3xl font-bold text-foreground">
              {Math.round(consumed.calories).toLocaleString()}
              <span className="text-base font-normal text-muted">
                {' '}
                / {calTarget.toLocaleString()}
              </span>
            </p>
          </div>
          <p className="text-sm text-muted">{calLeft.toLocaleString()} left</p>
        </div>
        <ProgressBar value={consumed.calories} max={calTarget} />
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
