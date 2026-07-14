'use client'

import { useActionState, useState } from 'react'
import { PreferencePicker } from '@/components/preference-picker'
import type { FoodPreferences } from '@/lib/fitness/types'
import { updateFoodPreferences, type SettingsState } from './actions'

export function SettingsForm({ initial }: { initial: FoodPreferences }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateFoodPreferences,
    undefined,
  )
  const [prefs, setPrefs] = useState<FoodPreferences>(initial)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="food_preferences" value={JSON.stringify(prefs)} />

      <PreferencePicker value={prefs} onChange={setPrefs} variant="list" />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save preferences'}
        </button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="text-sm text-success">Saved.</p>}
      </div>
    </form>
  )
}
