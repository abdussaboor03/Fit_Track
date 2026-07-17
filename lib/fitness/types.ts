export type Sex = 'male' | 'female'
export type GoalType = 'lose' | 'maintain' | 'gain'
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'active'
  | 'very_active'
export type WorkoutFrequency = 'none' | '1-2' | '3-4' | '5+'

// Soft food preferences from the paired-choice quiz: pair id -> chosen value.
export type FoodPreferences = Record<string, string>

export type Profile = {
  id: string
  full_name: string | null
  sex: Sex | null
  date_of_birth: string | null
  height_cm: number | null
  goal_type: GoalType | null
  target_weight_kg: number | null
  target_rate_kg_per_week: number | null
  activity_level: ActivityLevel | null
  workout_frequency: WorkoutFrequency | null
  dietary_restriction: string | null
  food_preferences: FoodPreferences | null
  water_target_ml: number | null
  daily_calorie_target: number | null
  daily_protein_g: number | null
  daily_carb_g: number | null
  daily_fat_g: number | null
  created_at: string
  updated_at: string
}

export type Targets = {
  bmr: number
  tdee: number
  calories: number
  proteinG: number
  carbG: number
  fatG: number
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little movement)',
  lightly_active: 'Lightly active (on your feet some of the day)',
  active: 'Active (physical job or lots of walking)',
  very_active: 'Very active (labor-intensive)',
}

export const WORKOUT_LABELS: Record<WorkoutFrequency, string> = {
  none: "None — I don't train",
  '1-2': '1–2× per week',
  '3-4': '3–4× per week',
  '5+': '5+ per week',
}
