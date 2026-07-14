import type { FoodPreferences } from './types'

// Paired-choice food-preference quiz. Each pair is a forced choice between two
// foods/styles; the chosen value is stored under the pair id in
// profiles.food_preferences (jsonb). These are *soft* preferences used to bias
// the meal-photo estimate — distinct from the hard dietary_restriction.
export type FoodPreferencePair = {
  id: string
  a: { value: string; label: string }
  b: { value: string; label: string }
}

export const FOOD_PREFERENCE_PAIRS: FoodPreferencePair[] = [
  {
    id: 'protein',
    a: { value: 'chicken breast', label: 'Chicken breast' },
    b: { value: 'chickpeas or lentils', label: 'Chickpeas or lentils' },
  },
  {
    id: 'meat',
    a: { value: 'red meat', label: 'Red meat' },
    b: { value: 'fish or seafood', label: 'Fish or seafood' },
  },
  {
    id: 'carb',
    a: { value: 'rice', label: 'Rice' },
    b: { value: 'roti or bread', label: 'Roti or bread' },
  },
  {
    id: 'produce',
    a: { value: 'vegetables', label: 'Vegetables' },
    b: { value: 'fruit', label: 'Fruit' },
  },
  {
    id: 'dairy',
    a: { value: 'yogurt', label: 'Yogurt' },
    b: { value: 'cheese', label: 'Cheese' },
  },
  {
    id: 'nuts',
    a: { value: 'nuts or seeds', label: 'Nuts or seeds' },
    b: { value: 'neither', label: 'Neither' },
  },
  {
    id: 'spice',
    a: { value: 'spicy', label: 'Spicy' },
    b: { value: 'mild', label: 'Mild' },
  },
  {
    id: 'style',
    a: { value: 'home-cooked', label: 'Home-cooked style' },
    b: { value: 'takeaway', label: 'Takeaway style' },
  },
]

// Safely coerce untrusted input (JSON string or object) into a FoodPreferences
// object, keeping only known pair ids whose value matches one of the options.
export function parseFoodPreferences(raw: unknown): FoodPreferences | null {
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object') return null

  const source = obj as Record<string, unknown>
  const result: FoodPreferences = {}
  for (const pair of FOOD_PREFERENCE_PAIRS) {
    const v = source[pair.id]
    if (v === pair.a.value || v === pair.b.value) {
      result[pair.id] = v
    }
  }
  return Object.keys(result).length ? result : null
}

// Short natural-language bias for the meal-photo prompt: what this person
// usually eats, so estimates lean toward it when a dish is ambiguous.
export function foodPreferenceBias(
  prefs: FoodPreferences | null | undefined,
): string | null {
  if (!prefs) return null
  const chosen = FOOD_PREFERENCE_PAIRS.map((p) => prefs[p.id]).filter(
    (v): v is string => Boolean(v) && v !== 'neither',
  )
  if (!chosen.length) return null
  return `When a dish is ambiguous, lean toward what this person usually eats: ${chosen.join(', ')}.`
}
