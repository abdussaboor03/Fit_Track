// Hero calorie gauge — a 270° arc that fills toward the daily target as meals
// are logged, in the same SVG-stroke visual language as onboarding's goal-step
// trend chart (gradient stroke, rounded caps, soft glow, draw-in animation).
// Pure render + CSS animation, so it stays a server component.

// 270° arc, open at the bottom (gap centered on 6 o'clock). Endpoints are
// symmetric; pathLength is normalized to 100 so progress maps directly to %.
const ARC_PATH = 'M 50.7 189.3 A 98 98 0 1 1 189.3 189.3'

export function CalorieArc({
  consumed,
  target,
}: {
  consumed: number
  target: number
}) {
  const eaten = Math.round(consumed)
  const hasTarget = target > 0
  const remaining = target - eaten
  const over = hasTarget && eaten > target
  // "Near target" once inside 150 kcal — amber, not a red alarm.
  const near = hasTarget && !over && remaining <= 150
  const pct = hasTarget ? Math.max(0, Math.min(100, (eaten / target) * 100)) : 0
  const offset = 100 - pct

  const amber = over || near
  const progressStroke = amber ? 'var(--warning)' : 'url(#calArcGrad)'
  const glow = amber
    ? 'drop-shadow(0 0 6px color-mix(in srgb, var(--warning) 55%, transparent))'
    : 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 45%, transparent))'

  const heroNumber = !hasTarget
    ? eaten.toLocaleString()
    : over
      ? (eaten - target).toLocaleString()
      : Math.max(0, remaining).toLocaleString()
  const heroLabel = !hasTarget
    ? 'kcal eaten'
    : over
      ? 'kcal over'
      : 'kcal remaining'

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="relative mx-auto aspect-square w-full max-w-[300px]">
        <svg viewBox="0 0 240 240" className="h-full w-full">
          <defs>
            <linearGradient id="calArcGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop
                offset="100%"
                stopColor="color-mix(in srgb, var(--accent) 55%, white)"
              />
            </linearGradient>
          </defs>

          {/* Track */}
          <path
            d={ARC_PATH}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={16}
            strokeLinecap="round"
            pathLength={100}
          />

          {/* Progress */}
          {pct > 0 && (
            <path
              d={ARC_PATH}
              fill="none"
              stroke={progressStroke}
              strokeWidth={16}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100 100"
              strokeDashoffset={offset}
              style={{
                filter: glow,
                animation: 'arcDraw .9s cubic-bezier(.2,.9,.15,1) both',
              }}
            />
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[44px] font-bold leading-none tracking-tight text-foreground">
            {heroNumber}
          </span>
          <span
            className={`mt-2 text-xs font-semibold uppercase tracking-wider ${
              amber ? 'text-warning' : 'text-muted'
            }`}
          >
            {heroLabel}
          </span>
          {hasTarget && (
            <span className="mt-2 text-sm text-muted">
              {eaten.toLocaleString()} eaten of {target.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
