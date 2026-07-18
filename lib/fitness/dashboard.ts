// Dashboard status logic. Pure, rule-based computations over data already
// collected (meals, daily_logs, profiles) — no AI calls, no new tables. Tone is
// deliberately reassuring: no failure/guilt framing anywhere.

// Takes an explicit hour (0–23) so the caller controls the timezone — pass
// nowHour() from lib/fitness/date, which is London-based.
export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
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
    return "Protein's running a little behind — easy to catch up."
  }

  return "You're on track today."
}

// --- "Your next move": one rule-based recommendation from existing data ---

export type NextMove = {
  text: string
  actionLabel: string
  actionHref: string
}

export type NextMoveInput = {
  hour: number
  mealCount: number
  calories: number
  calorieTarget: number
  protein: number
  proteinTarget: number
  water: number
  waterTarget: number
}

// Nothing logged this late in the day is the most important thing to surface.
const DINNER_HOUR = 20

// Expected share of daily intake by this hour, over a rough 08:00–21:00 eating
// window. Used to judge whether things are "on pace" for the time of day.
function paceFraction(hour: number): number {
  return Math.max(0, Math.min(1, (hour - 8) / 13))
}
function onPace(value: number, target: number, hour: number): boolean {
  if (target <= 0) return true
  return value >= paceFraction(hour) * target * 0.85
}

const LOG_MEAL = { actionLabel: 'Log meal', actionHref: '/log/meal' }
const ADD_WATER = { actionLabel: 'Add water', actionHref: '/log/daily' }

// Picks the single most relevant next action. Priority-ordered: the first rule
// that applies wins. Pure logic over data already collected — no AI call.
export function nextMove(s: NextMoveInput): NextMove {
  // 1. Late in the day with nothing logged at all.
  if (s.hour >= DINNER_HOUR && s.mealCount === 0) {
    return {
      text: 'Nothing logged yet today — add your first meal for an accurate picture.',
      ...LOG_MEAL,
    }
  }

  // 2. Protein well behind pace once the afternoon is underway.
  if (s.proteinTarget > 0 && s.hour >= 15 && s.protein < 0.6 * s.proteinTarget) {
    const gap = Math.max(0, Math.round(s.proteinTarget - s.protein))
    return {
      text: `Add ~${gap}g of protein across your remaining meals to stay close to today's target.`,
      ...LOG_MEAL,
    }
  }

  // 3. Water behind, later in the day.
  if (s.waterTarget > 0 && s.hour >= 17 && s.water < 0.5 * s.waterTarget) {
    const shortMl = Math.max(0, Math.round(s.waterTarget - s.water))
    return {
      text: `About ${shortMl}ml left to your water goal — one full bottle gets you most of the way there.`,
      ...ADD_WATER,
    }
  }

  // 4. Core targets all on pace for the time of day.
  if (
    s.mealCount > 0 &&
    onPace(s.calories, s.calorieTarget, s.hour) &&
    onPace(s.protein, s.proteinTarget, s.hour) &&
    onPace(s.water, s.waterTarget, s.hour)
  ) {
    return {
      text: "You're on track — keep today simple and repeat what's working.",
      ...LOG_MEAL,
    }
  }

  // 5. Fallback.
  return {
    text: "Log today's meals to see your next move.",
    ...LOG_MEAL,
  }
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
