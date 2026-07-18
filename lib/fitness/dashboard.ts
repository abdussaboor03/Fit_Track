// Dashboard status logic. Pure, rule-based computations over data already
// collected (meals, daily_logs, profiles) — no AI calls, no new tables. Tone is
// deliberately reassuring: no failure/guilt framing anywhere.

export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export type StatusInput = {
  hasAnyLog: boolean
  hour: number
  calories: number
  calorieTarget: number
  protein: number
  proteinTarget: number
  water: number
  waterTarget: number
}

// Picks the single most relevant status line for today. Priority is ordered so
// the most salient state wins; "over target" is framed around the weekly
// average rather than as a failure.
export function dashboardStatusLine(s: StatusInput): string {
  if (!s.hasAnyLog) return 'Today is a fresh start.'

  if (s.calorieTarget > 0 && s.calories > s.calorieTarget) {
    return "You're over today's target — your weekly average can still stay on track."
  }

  const proteinHit = s.proteinTarget > 0 && s.protein >= s.proteinTarget
  const waterHit = s.waterTarget > 0 && s.water >= s.waterTarget
  const calorieMet = s.calorieTarget > 0 && s.calories >= s.calorieTarget * 0.85
  if (proteinHit && waterHit && calorieMet) {
    return 'You hit every target today.'
  }

  // Protein notably behind pace once the day is well underway.
  if (s.proteinTarget > 0 && s.hour >= 15 && s.protein < 0.6 * s.proteinTarget) {
    return 'Protein needs attention.'
  }

  return "You're on track today."
}

// Consecutive logged days ending today. If today isn't logged yet, a streak
// running through yesterday still counts as active (it only breaks once a whole
// day is missed).
export function loggingStreak(loggedDates: Set<string>, today: string): number {
  const toDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const toISO = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const cursor = toDate(today)
  if (!loggedDates.has(today)) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (loggedDates.has(toISO(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
