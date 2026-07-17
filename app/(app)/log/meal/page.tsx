import Link from 'next/link'
import { verifyUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MealForm, type RecentMeal } from './meal-form'

// Last N distinct meal names the user has logged, each carrying the macros from
// its most recent entry so re-logging is one tap. Derived from frequency of use
// — no schema change, no explicit favorite flag.
async function getRecentMeals(userId: string): Promise<RecentMeal[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('meals')
    .select('meal_name, calories, protein_g, carbs_g, fat_g, description')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)

  const seen = new Set<string>()
  const recent: RecentMeal[] = []
  for (const m of data ?? []) {
    const name = (m.meal_name as string)?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    recent.push({
      mealName: name,
      description: (m.description as string | null) ?? '',
      calories: m.calories != null ? Number(m.calories) : null,
      proteinG: m.protein_g != null ? Number(m.protein_g) : null,
      carbsG: m.carbs_g != null ? Number(m.carbs_g) : null,
      fatG: m.fat_g != null ? Number(m.fat_g) : null,
    })
    if (recent.length >= 10) break
  }
  return recent
}

export default async function LogMealPage() {
  const { userId } = await verifyUser()
  const recent = await getRecentMeals(userId)

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
        Log a meal
      </h1>
      <p className="mb-6 text-sm text-muted">
        Re-log a recent meal, snap a photo for an instant estimate, or enter the
        details manually.
      </p>

      <MealForm recent={recent} />

      <p className="mt-6 text-center text-sm">
        <Link href="/dashboard" className="text-muted hover:text-foreground">
          Back to dashboard
        </Link>
      </p>
    </div>
  )
}
