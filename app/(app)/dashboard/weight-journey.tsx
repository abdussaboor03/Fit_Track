import Link from 'next/link'

const kg = (v: number) => `${Math.round(v * 10) / 10} kg`
const signedKg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 10) / 10)} kg`

// The dashboard's weight element. Before a real trend can be trusted (fewer
// than 3 weigh-ins), it shows the plan in plain numbers and nudges toward
// logging. Once there's enough data, the 7-day moving average — not raw daily
// entries — is the headline, with progress along the start→target journey.
export function WeightJourney({
  weighInCount,
  startKg,
  currentKg,
  targetKg,
  movingAvg,
  totalChange,
  pctComplete,
  weeklyChange,
}: {
  weighInCount: number
  startKg: number | null
  currentKg: number | null
  targetKg: number | null
  movingAvg: number | null
  totalChange: number | null
  pctComplete: number | null
  weeklyChange: number | null
}) {
  const enoughData = weighInCount >= 3

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Weight journey</p>
        {enoughData && movingAvg != null && (
          <p className="text-sm text-muted">
            7-day avg{' '}
            <span className="font-semibold text-foreground">{kg(movingAvg)}</span>
          </p>
        )}
      </div>

      {!enoughData ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Start" value={startKg != null ? kg(startKg) : '—'} />
            <Stat label="Current" value={currentKg != null ? kg(currentKg) : '—'} />
            <Stat label="Target" value={targetKg != null ? kg(targetKg) : '—'} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Log your weight three times this week and we&apos;ll start showing
            your real trend, separate from daily fluctuations.
          </p>
          <Link
            href="/log/daily"
            className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Log today&apos;s weight
          </Link>
        </>
      ) : (
        <>
          {/* Headline: 7-day moving average */}
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tracking-tight text-foreground">
              {movingAvg != null ? Math.round(movingAvg * 10) / 10 : '—'}
            </span>
            <span className="mb-1 text-sm text-muted">kg · 7-day average</span>
          </div>

          {/* Progress along start → target */}
          {startKg != null && targetKg != null && pctComplete != null && (
            <div className="mt-5">
              <div className="relative h-2 rounded-full bg-surface-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent"
                  style={{ width: `${pctComplete}%` }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-surface"
                  style={{ left: `${pctComplete}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{kg(startKg)}</span>
                <span>{kg(targetKg)}</span>
              </div>
            </div>
          )}

          {/* Supporting figures */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat
              label="Total change"
              value={totalChange != null ? signedKg(totalChange) : '—'}
            />
            <Stat
              label="Complete"
              value={pctComplete != null ? `${Math.round(pctComplete)}%` : '—'}
            />
            <Stat
              label="This week"
              value={weeklyChange != null ? signedKg(weeklyChange) : '—'}
            />
          </div>
        </>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}
