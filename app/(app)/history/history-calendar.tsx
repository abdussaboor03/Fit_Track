'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export type DayMeal = {
  name: string
  time: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}
export type DayWorkout = {
  name: string
  sets: number | null
  reps: number | null
  weight: number | null
}
export type DayData = {
  date: string
  weightKg: number | null
  wentGym: boolean
  steps: number | null
  waterMl: number
  notes: string | null
  meals: DayMeal[]
  workouts: DayWorkout[]
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function hasAnything(d: DayData) {
  return (
    d.weightKg != null ||
    d.wentGym ||
    d.steps != null ||
    d.waterMl > 0 ||
    !!d.notes ||
    d.meals.length > 0 ||
    d.workouts.length > 0
  )
}

export function HistoryCalendar({
  year,
  month,
  monthLabel,
  prevMonth,
  nextMonth,
  today,
  days,
}: {
  year: number
  month: number
  monthLabel: string
  prevMonth: string
  nextMonth: string
  today: string
  days: DayData[]
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, DayData>()
    for (const d of days) map.set(d.date, d)
    return map
  }, [days])

  const [selected, setSelected] = useState<string | null>(null)

  // Leading blank cells so day 1 lands under its weekday.
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedData = selected ? byDate.get(selected) : undefined

  return (
    <div className="flex flex-col gap-6">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Link
          href={`/history?month=${prevMonth}`}
          aria-label="Previous month"
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          ←
        </Link>
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <Link
          href={`/history?month=${nextMonth}`}
          aria-label="Next month"
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          →
        </Link>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <div
              key={i}
              className="py-1 text-center text-xs font-medium text-muted"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day == null) return <div key={`b${i}`} />
            const date = `${year}-${pad(month)}-${pad(day)}`
            const data = byDate.get(date)
            const logged = data ? hasAnything(data) : false
            const isToday = date === today
            const isSelected = date === selected
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(isSelected ? null : date)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-colors ${
                  isSelected
                    ? 'border-accent bg-[var(--accent-soft)] text-foreground'
                    : logged
                      ? 'border-border bg-surface-2 text-foreground hover:border-accent'
                      : 'border-transparent text-muted hover:bg-surface-2'
                }`}
              >
                <span className={isToday ? 'font-bold text-accent' : ''}>
                  {day}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {logged && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent"
                      title="Logged"
                    />
                  )}
                  {data?.weightKg != null && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-success"
                      title="Weight logged"
                    />
                  )}
                  {data?.wentGym && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-warning"
                      title="Gym day"
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
          <Legend color="bg-accent" label="Logged" />
          <Legend color="bg-success" label="Weight" />
          <Legend color="bg-warning" label="Gym" />
        </div>
      </div>

      {/* Selected day detail */}
      {selected && <DayDetail date={selected} data={selectedData} />}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function DayDetail({ date, data }: { date: string; data?: DayData }) {
  const heading = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  ).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (!data || !hasAnything(data)) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm font-semibold text-foreground">{heading}</p>
        <p className="mt-2 text-sm text-muted">Nothing logged this day.</p>
      </section>
    )
  }

  const mealTotals = data.meals.reduce(
    (acc, m) => acc + (m.calories ?? 0),
    0,
  )

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <p className="text-sm font-semibold text-foreground">{heading}</p>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        {data.weightKg != null && (
          <span>
            Weight{' '}
            <span className="font-semibold text-foreground">
              {Math.round(data.weightKg * 10) / 10} kg
            </span>
          </span>
        )}
        {data.steps != null && (
          <span>
            Steps{' '}
            <span className="font-semibold text-foreground">
              {data.steps.toLocaleString()}
            </span>
          </span>
        )}
        {data.waterMl > 0 && (
          <span>
            Water{' '}
            <span className="font-semibold text-foreground">
              {(data.waterMl / 1000).toFixed(data.waterMl % 1000 === 0 ? 0 : 1)} L
            </span>
          </span>
        )}
      </div>

      {/* Meals */}
      {data.meals.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Meals · {Math.round(mealTotals).toLocaleString()} kcal
          </p>
          <div className="flex flex-col gap-2">
            {data.meals.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.name || 'Meal'}
                    {m.time && (
                      <span className="ml-2 text-xs text-muted">
                        {m.time.slice(0, 5)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    P {Math.round(m.protein ?? 0)}g · C {Math.round(m.carbs ?? 0)}g
                    · F {Math.round(m.fat ?? 0)}g
                  </p>
                </div>
                {m.calories != null && (
                  <span className="flex-shrink-0 text-sm text-muted">
                    {m.calories} kcal
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workouts */}
      {data.workouts.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Training
          </p>
          <div className="flex flex-col gap-2">
            {data.workouts.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                <p className="truncate text-sm font-medium text-foreground">
                  {w.name || 'Exercise'}
                </p>
                <span className="flex-shrink-0 text-xs text-muted">
                  {[
                    w.sets != null && w.reps != null
                      ? `${w.sets}×${w.reps}`
                      : null,
                    w.weight != null ? `${w.weight} kg` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.notes && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            Notes
          </p>
          <p className="text-sm text-foreground">{data.notes}</p>
        </div>
      )}
    </section>
  )
}
