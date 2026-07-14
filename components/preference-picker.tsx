'use client'

import { FOOD_PREFERENCE_PAIRS } from '@/lib/fitness/preferences'
import type { FoodPreferences } from '@/lib/fitness/types'

// Renders the food-preference pairs as forced-choice toggles. `cards` is the
// bigger, tappable onboarding presentation; `list` is the compact edit view.
export function PreferencePicker({
  value,
  onChange,
  variant = 'cards',
}: {
  value: FoodPreferences
  onChange: (next: FoodPreferences) => void
  variant?: 'cards' | 'list'
}) {
  const isCards = variant === 'cards'
  const pad = isCards ? 'px-3 py-4' : 'px-3 py-2'

  return (
    <div className={`flex flex-col ${isCards ? 'gap-3' : 'gap-2'}`}>
      {FOOD_PREFERENCE_PAIRS.map((pair) => (
        <div
          key={pair.id}
          className={
            isCards
              ? 'grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-2 p-2'
              : 'grid grid-cols-2 gap-2'
          }
        >
          {[pair.a, pair.b].map((opt) => {
            const active = value[pair.id] === opt.value
            const inactive = isCards
              ? 'border-transparent bg-surface text-muted hover:text-foreground'
              : 'border-border bg-surface-2 text-muted hover:text-foreground'
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...value, [pair.id]: opt.value })}
                className={`rounded-lg border text-sm font-medium transition-colors ${pad} ${
                  active
                    ? 'border-accent bg-[var(--accent-soft)] text-foreground'
                    : inactive
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
