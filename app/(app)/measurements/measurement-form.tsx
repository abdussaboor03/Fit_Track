'use client'

import { useActionState, useState } from 'react'
import { BODY_PARTS, BODY_PART_LABELS } from '@/lib/fitness/types'
import { saveMeasurement, type MeasurementState } from './actions'

export function MeasurementForm({
  logDate,
  initial,
}: {
  logDate: string
  initial: Partial<Record<(typeof BODY_PARTS)[number], string>>
}) {
  const [state, formAction, pending] = useActionState<MeasurementState, FormData>(
    saveMeasurement,
    undefined,
  )
  const [date, setDate] = useState(logDate)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="log_date" value={date} />

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {BODY_PARTS.map((part) => (
            <div key={part} className="flex flex-col gap-2">
              <label htmlFor={part} className="text-sm font-medium text-foreground">
                {BODY_PART_LABELS[part]} <span className="text-muted">(cm)</span>
              </label>
              <input
                id={part}
                name={part}
                className="input"
                type="number"
                inputMode="decimal"
                defaultValue={initial[part] ?? ''}
                placeholder="—"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notes <span className="text-muted">(optional)</span>
          </label>
          <input id="notes" name="notes" className="input" placeholder="Anything to remember" />
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">Measurements saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save measurements'}
      </button>
    </form>
  )
}
