'use client'

import { useActionState, useState } from 'react'
import { kgToLb, lbToKg } from '@/lib/fitness/calc'
import { saveDailyLog, type DailyState } from './actions'

type WeightUnit = 'kg' | 'lb'
type ExerciseRow = { name: string; sets: string; reps: string; weight: string }

const emptyRow = (): ExerciseRow => ({
  name: '',
  sets: '',
  reps: '',
  weight: '',
})

export function DailyForm({
  logDate,
  initialWeightKg,
}: {
  logDate: string
  initialWeightKg: number | null
}) {
  const [state, formAction, pending] = useActionState<DailyState, FormData>(
    saveDailyLog,
    undefined,
  )

  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [weight, setWeight] = useState(
    initialWeightKg != null ? String(round(initialWeightKg)) : '',
  )
  const [wentGym, setWentGym] = useState(false)
  const [steps, setSteps] = useState('')
  const [rows, setRows] = useState<ExerciseRow[]>([emptyRow()])

  const weightKg =
    weight.trim() === ''
      ? ''
      : (weightUnit === 'kg'
          ? Number(weight)
          : lbToKg(Number(weight))
        ).toFixed(2)

  function toggleUnit(next: WeightUnit) {
    if (next === weightUnit) return
    // Convert the visible value so the underlying kg stays the same.
    if (weight.trim() !== '') {
      const asKg = weightUnit === 'kg' ? Number(weight) : lbToKg(Number(weight))
      setWeight(String(round(next === 'kg' ? asKg : kgToLb(asKg))))
    }
    setWeightUnit(next)
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="log_date" value={logDate} />
      <input type="hidden" name="weight_kg" value={weightKg} />

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Body weight
          </label>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(['kg', 'lb'] as WeightUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => toggleUnit(u)}
                className={`px-2.5 py-1 text-xs transition-colors ${
                  weightUnit === u
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-muted hover:text-foreground'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <input
          className="input mt-2 w-full"
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={weightUnit === 'kg' ? '75' : '165'}
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Did you train today?
            </p>
            <p className="text-xs text-muted">Log your session below.</p>
          </div>
          <input
            type="checkbox"
            name="went_gym"
            checked={wentGym}
            onChange={(e) => setWentGym(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent)]"
          />
        </div>

        {wentGym && (
          <div className="mt-4 flex flex-col gap-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface-2 p-3"
              >
                <input
                  className="input mb-2 w-full"
                  name="exercise_name"
                  value={row.name}
                  onChange={(e) => updateRow(setRows, i, 'name', e.target.value)}
                  placeholder="Exercise (e.g. Bench press)"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="input"
                    name="sets"
                    type="number"
                    inputMode="numeric"
                    value={row.sets}
                    onChange={(e) => updateRow(setRows, i, 'sets', e.target.value)}
                    placeholder="Sets"
                  />
                  <input
                    className="input"
                    name="reps"
                    type="number"
                    inputMode="numeric"
                    value={row.reps}
                    onChange={(e) => updateRow(setRows, i, 'reps', e.target.value)}
                    placeholder="Reps"
                  />
                  <input
                    className="input"
                    name="exercise_weight"
                    type="number"
                    inputMode="decimal"
                    value={row.weight}
                    onChange={(e) =>
                      updateRow(setRows, i, 'weight', e.target.value)
                    }
                    placeholder="kg"
                  />
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRows((r) => r.filter((_, idx) => idx !== i))
                    }
                    className="mt-2 text-xs text-muted hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((r) => [...r, emptyRow()])}
              className="rounded-lg border border-dashed border-border py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
            >
              + Add exercise
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <label className="text-sm font-medium text-foreground">Steps</label>
        <input
          className="input mt-2 w-full"
          name="steps"
          type="number"
          inputMode="numeric"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="e.g. 8000"
        />
      </section>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save check-in'}
      </button>
    </form>
  )
}

function round(n: number) {
  return Math.round(n * 10) / 10
}

function updateRow(
  setRows: React.Dispatch<React.SetStateAction<ExerciseRow[]>>,
  index: number,
  key: keyof ExerciseRow,
  value: string,
) {
  setRows((rows) =>
    rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
  )
}
