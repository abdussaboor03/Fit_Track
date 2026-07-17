'use client'

import { useState, useTransition } from 'react'
import { setWaterMl } from './actions'

const QUICK_ADDS = [250, 500]

export function WaterTracker({
  logDate,
  initialMl,
  targetMl,
}: {
  logDate: string
  initialMl: number
  targetMl: number
}) {
  const [ml, setMl] = useState(initialMl)
  const [custom, setCustom] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const target = targetMl > 0 ? targetMl : 2500
  const pct = Math.min(100, Math.round((ml / target) * 100))

  function commit(next: number) {
    const clamped = Math.max(0, next)
    setMl(clamped) // optimistic
    setError(null)
    startTransition(async () => {
      const res = await setWaterMl(logDate, clamped)
      if (!res.ok) {
        setError(res.error)
      } else {
        setMl(res.waterMl)
      }
    })
  }

  function addCustom() {
    const v = Number(custom)
    if (!Number.isFinite(v) || v <= 0) return
    commit(ml + Math.round(v))
    setCustom('')
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Water</p>
          <p className="text-xs text-muted">Tap to add as you drink.</p>
        </div>
        <p className="text-sm text-muted">
          <span className="text-lg font-semibold text-foreground">
            {(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)}
          </span>
          {' / '}
          {(target / 1000).toFixed(target % 1000 === 0 ? 0 : 1)} L
        </p>
      </div>

      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_ADDS.map((amt) => (
          <button
            key={amt}
            type="button"
            disabled={pending}
            onClick={() => commit(ml + amt)}
            className="rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:opacity-60"
          >
            +{amt}ml
          </button>
        ))}
        <div className="flex items-center gap-2">
          <input
            className="input w-24"
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustom()
              }
            }}
            placeholder="ml"
          />
          <button
            type="button"
            disabled={pending || custom.trim() === ''}
            onClick={addCustom}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            Add
          </button>
        </div>
        {ml > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => commit(0)}
            className="ml-auto text-xs text-muted transition-colors hover:text-danger disabled:opacity-60"
          >
            Reset
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  )
}
