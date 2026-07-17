import { verifyUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/fitness/date'
import { HistoryCalendar, type DayData } from './history-calendar'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// A YYYY-MM string shifted by `delta` months.
function shiftMonth(year: number, month1: number, delta: number): string {
  const d = new Date(year, month1 - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  // Resolve the target month (YYYY-MM), defaulting to the current one.
  const now = new Date()
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '')
  const year = match ? Number(match[1]) : now.getFullYear()
  const month1 = match ? Number(match[2]) : now.getMonth() + 1

  const daysInMonth = new Date(year, month1, 0).getDate()
  const rangeStart = `${year}-${pad(month1)}-01`
  const rangeEnd = `${year}-${pad(month1)}-${pad(daysInMonth)}`

  const [logsRes, mealsRes, workoutsRes] = await Promise.all([
    supabase
      .from('daily_logs')
      .select('log_date, weight_kg, went_gym, steps, water_ml, notes')
      .eq('user_id', userId)
      .gte('log_date', rangeStart)
      .lte('log_date', rangeEnd),
    supabase
      .from('meals')
      .select('log_date, meal_name, meal_time, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', userId)
      .gte('log_date', rangeStart)
      .lte('log_date', rangeEnd)
      .order('meal_time', { ascending: true }),
    supabase
      .from('workouts')
      .select('log_date, exercise_name, sets, reps, weight_kg')
      .eq('user_id', userId)
      .gte('log_date', rangeStart)
      .lte('log_date', rangeEnd),
  ])

  // Assemble one record per day that has anything logged.
  const byDate = new Map<string, DayData>()
  const ensure = (date: string): DayData => {
    let d = byDate.get(date)
    if (!d) {
      d = {
        date,
        weightKg: null,
        wentGym: false,
        steps: null,
        waterMl: 0,
        notes: null,
        meals: [],
        workouts: [],
      }
      byDate.set(date, d)
    }
    return d
  }

  for (const l of logsRes.data ?? []) {
    const d = ensure(l.log_date as string)
    d.weightKg = l.weight_kg != null ? Number(l.weight_kg) : null
    d.wentGym = Boolean(l.went_gym)
    d.steps = l.steps != null ? Number(l.steps) : null
    d.waterMl = Number(l.water_ml ?? 0)
    d.notes = (l.notes as string | null) ?? null
  }
  for (const m of mealsRes.data ?? []) {
    ensure(m.log_date as string).meals.push({
      name: (m.meal_name as string) ?? '',
      time: (m.meal_time as string | null) ?? null,
      calories: m.calories != null ? Number(m.calories) : null,
      protein: m.protein_g != null ? Number(m.protein_g) : null,
      carbs: m.carbs_g != null ? Number(m.carbs_g) : null,
      fat: m.fat_g != null ? Number(m.fat_g) : null,
    })
  }
  for (const w of workoutsRes.data ?? []) {
    ensure(w.log_date as string).workouts.push({
      name: (w.exercise_name as string) ?? '',
      sets: w.sets != null ? Number(w.sets) : null,
      reps: w.reps != null ? Number(w.reps) : null,
      weight: w.weight_kg != null ? Number(w.weight_kg) : null,
    })
  }

  const monthLabel = new Date(year, month1 - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
        History
      </h1>
      <p className="mb-6 text-sm text-muted">
        Tap any day to see everything you logged.
      </p>

      <HistoryCalendar
        year={year}
        month={month1}
        monthLabel={monthLabel}
        prevMonth={shiftMonth(year, month1, -1)}
        nextMonth={shiftMonth(year, month1, 1)}
        today={todayISO()}
        days={Array.from(byDate.values())}
      />
    </div>
  )
}
