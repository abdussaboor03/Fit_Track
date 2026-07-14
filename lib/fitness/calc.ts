import type {
  ActivityLevel,
  GoalType,
  Sex,
  Targets,
  WorkoutFrequency,
} from './types'

/* ---------- unit conversions ---------- */

export const KG_PER_LB = 0.45359237
export const CM_PER_IN = 2.54
export const KCAL_PER_KG_FAT = 7700

export const lbToKg = (lb: number) => lb * KG_PER_LB
export const kgToLb = (kg: number) => kg / KG_PER_LB
export const inToCm = (inches: number) => inches * CM_PER_IN
export const cmToIn = (cm: number) => cm / CM_PER_IN

export function ftInToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches)
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalIn = cmToIn(cm)
  const feet = Math.floor(totalIn / 12)
  const inches = Math.round(totalIn - feet * 12)
  return { feet, inches }
}

/* ---------- age ---------- */

export function ageFromDob(dob: string | Date, on: Date = new Date()): number {
  const birth = typeof dob === 'string' ? new Date(dob) : dob
  let age = on.getFullYear() - birth.getFullYear()
  const m = on.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) age--
  return age
}

/* ---------- BMR (Mifflin-St Jeor) ---------- */

export function bmrMifflin(params: {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
}): number {
  const { sex, weightKg, heightCm, age } = params
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/* ---------- Activity multiplier (combines lifestyle + training) ---------- */

const BASE_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  active: 1.55,
  very_active: 1.725,
}

// Training on top of daily lifestyle nudges the multiplier upward.
const WORKOUT_BONUS: Record<WorkoutFrequency, number> = {
  none: 0,
  '1-2': 0.05,
  '3-4': 0.1,
  '5+': 0.15,
}

export function activityMultiplier(
  activityLevel: ActivityLevel,
  workoutFrequency: WorkoutFrequency,
): number {
  const combined =
    BASE_MULTIPLIER[activityLevel] + WORKOUT_BONUS[workoutFrequency]
  // Keep it in a sane physiological band.
  return Math.min(1.9, Number(combined.toFixed(3)))
}

/* ---------- Rate cap (max ~1% bodyweight per week) ---------- */

export function maxWeeklyRateKg(currentWeightKg: number): number {
  return Number((currentWeightKg * 0.01).toFixed(2))
}

export function isRateTooFast(
  rateKgPerWeek: number,
  currentWeightKg: number,
): boolean {
  return Math.abs(rateKgPerWeek) > maxWeeklyRateKg(currentWeightKg) + 1e-9
}

/* ---------- Target date <-> rate conversion ---------- */

// Weeks between current and target weight at a given weekly rate.
export function weeksToGoal(
  currentWeightKg: number,
  targetWeightKg: number,
  rateKgPerWeek: number,
): number | null {
  const diff = Math.abs(currentWeightKg - targetWeightKg)
  if (rateKgPerWeek <= 0) return null
  return diff / rateKgPerWeek
}

// Implied weekly rate given a target date.
export function rateFromTargetDate(
  currentWeightKg: number,
  targetWeightKg: number,
  targetDate: string | Date,
  from: Date = new Date(),
): number | null {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  const ms = target.getTime() - from.getTime()
  const weeks = ms / (1000 * 60 * 60 * 24 * 7)
  if (weeks <= 0) return null
  const diff = Math.abs(currentWeightKg - targetWeightKg)
  return Number((diff / weeks).toFixed(3))
}

// Projected date to reach the target at a given rate.
export function targetDateFromRate(
  currentWeightKg: number,
  targetWeightKg: number,
  rateKgPerWeek: number,
  from: Date = new Date(),
): Date | null {
  const weeks = weeksToGoal(currentWeightKg, targetWeightKg, rateKgPerWeek)
  if (weeks === null) return null
  return new Date(from.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)
}

/* ---------- Calorie + macro targets ---------- */

export type TargetInput = {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
  goalType: GoalType
  targetWeightKg: number
  rateKgPerWeek: number
  activityLevel: ActivityLevel
  workoutFrequency: WorkoutFrequency
}

export function computeTargets(input: TargetInput): Targets {
  const {
    sex,
    weightKg,
    heightCm,
    age,
    goalType,
    targetWeightKg,
    rateKgPerWeek,
    activityLevel,
    workoutFrequency,
  } = input

  const bmr = bmrMifflin({ sex, weightKg, heightCm, age })
  const tdee = bmr * activityMultiplier(activityLevel, workoutFrequency)

  // Daily energy delta from the weekly rate, capped at 1000 kcal/day.
  const dailyDelta = Math.min(
    1000,
    (Math.abs(rateKgPerWeek) * KCAL_PER_KG_FAT) / 7,
  )

  let calories = tdee
  if (goalType === 'lose') {
    // Never diet below BMR.
    calories = Math.max(bmr, tdee - dailyDelta)
  } else if (goalType === 'gain') {
    calories = tdee + dailyDelta
  }

  // Protein anchored to goal bodyweight, fat as a share of calories, carbs fill the rest.
  const proteinG = 2.0 * targetWeightKg
  const fatG = (calories * 0.25) / 9
  const carbCalories = calories - proteinG * 4 - fatG * 9
  const carbG = Math.max(0, carbCalories / 4)

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    carbG: Math.round(carbG),
    fatG: Math.round(fatG),
  }
}
