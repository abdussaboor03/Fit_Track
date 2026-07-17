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

// Body measurements: optional circumference tracking. All parts nullable.
export type BodyPart = 'waist' | 'chest' | 'arms' | 'thighs' | 'hips'

export type BodyMeasurement = {
  id: string
  user_id: string
  log_date: string
  waist_cm: number | null
  chest_cm: number | null
  arms_cm: number | null
  thighs_cm: number | null
  hips_cm: number | null
  notes: string | null
  created_at: string
}

export const BODY_PARTS: BodyPart[] = ['waist', 'chest', 'arms', 'thighs', 'hips']

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  waist: 'Waist',
  chest: 'Chest',
  arms: 'Arms',
  thighs: 'Thighs',
  hips: 'Hips',
}

// Maps a body part to its measurement column on the body_measurements row.
export const BODY_PART_COLUMN: Record<BodyPart, keyof BodyMeasurement> = {
  waist: 'waist_cm',
  chest: 'chest_cm',
  arms: 'arms_cm',
  thighs: 'thighs_cm',
  hips: 'hips_cm',
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
