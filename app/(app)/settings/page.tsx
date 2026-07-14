import { requireProfile } from '@/lib/auth/dal'
import type { FoodPreferences } from '@/lib/fitness/types'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const profile = await requireProfile()
  const prefs = (profile.food_preferences as FoodPreferences | null) ?? {}

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
        Settings
      </h1>
      <p className="mb-6 text-sm text-muted">
        Update your food preferences anytime — they bias your meal-photo
        estimates toward what you actually eat.
      </p>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="mb-4 text-sm font-medium text-foreground">
          Food preferences
        </p>
        <SettingsForm initial={prefs} />
      </section>
    </div>
  )
}
