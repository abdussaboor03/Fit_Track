'use client'

import { useState, useTransition } from 'react'
import { setWaterMl } from '../log/daily/actions'

const fmtL = (v: number) => (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)

// Compact dashboard water tile with inline quick-add. Persists optimistically
// through the same setWaterMl action as the daily check-in tracker.
export function WaterTile({
  logDate,
  initialMl,
  targetMl,
}: {
  logDate: string
  initialMl: number
  targetMl: number
}) {
  const [ml, setMl] = useState(initialMl)
  const [pending, startTransition] = useTransition()

  const target = targetMl > 0 ? targetMl : 2500
  const pct = Math.min(100, Math.round((ml / target) * 100))

  function add(amount: number) {
    const next = Math.max(0, ml + amount)
    setMl(next)
    startTransition(async () => {
      const res = await setWaterMl(logDate, next)
      if (res.ok) setMl(res.waterMl)
    })
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M9 2s5 5.2 5 8.6A5 5 0 0 1 4 10.6C4 7.2 9 2 9 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-medium">Water</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">
        {fmtL(ml)}
        <span className="text-xs font-normal text-muted"> / {fmtL(target)} L</span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        {[250, 500].map((amt) => (
          <button
            key={amt}
            type="button"
            disabled={pending}
            onClick={() => add(amt)}
            className="flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent disabled:opacity-60"
          >
            +{amt}
          </button>
        ))}
      </div>
    </div>
  )
}
