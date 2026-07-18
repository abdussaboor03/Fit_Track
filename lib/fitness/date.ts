// Date helpers keyed to the user's calendar day. FitTrack logs are filed by
// London calendar date, and the dashboard's time-of-day logic reads the London
// hour, regardless of the server's timezone. Vercel runs functions in UTC, so
// relying on the server's local clock would misfile logs and shift greeting /
// pace boundaries by an hour during BST. Europe/London is applied explicitly
// here (rather than via a TZ env var) so the behaviour is guaranteed wherever
// the app runs.

const ZONE = 'Europe/London'

const pad = (n: number) => String(n).padStart(2, '0')

// Year/month/day/hour of an instant, as seen on the wall clock in ZONE.
function zonedParts(d: Date): {
  year: number
  month: number
  day: number
  hour: number
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
  }
}

export function todayISO(d: Date = new Date()): string {
  const { year, month, day } = zonedParts(d)
  return `${year}-${pad(month)}-${pad(day)}`
}

// Hour (0–23) on the London wall clock. Used by the dashboard's time-of-day
// greeting and pace checks.
export function nowHour(d: Date = new Date()): number {
  return zonedParts(d).hour
}

export function isoDaysAgo(days: number, from: Date = new Date()): string {
  const { year, month, day } = zonedParts(from)
  // Anchor to the London calendar date, then step whole days in UTC so the
  // arithmetic is immune to DST transitions.
  const shifted = new Date(Date.UTC(year, month - 1, day) - days * 86_400_000)
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
