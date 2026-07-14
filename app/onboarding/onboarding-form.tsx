'use client'

import { useActionState, useMemo, useState } from 'react'
import {
  ageFromDob,
  computeTargets,
  ftInToCm,
  isRateTooFast,
  lbToKg,
  maxWeeklyRateKg,
  kgToLb,
  rateFromTargetDate,
  targetDateFromRate,
} from '@/lib/fitness/calc'
import {
  ACTIVITY_LABELS,
  WORKOUT_LABELS,
  type ActivityLevel,
  type FoodPreferences,
  type GoalType,
  type Sex,
  type WorkoutFrequency,
} from '@/lib/fitness/types'
import { PreferencePicker } from '@/components/preference-picker'
import { saveProfile, type OnboardingState } from './actions'

type WeightUnit = 'kg' | 'lb'
type HeightUnit = 'cm' | 'ftin'
type GoalMode = 'rate' | 'date'
type DietPreset = 'none' | 'halal' | 'vegetarian' | 'vegan' | 'other'

const n = (v: string) => (v.trim() === '' ? NaN : Number(v))

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    saveProfile,
    undefined,
  )

  const [fullName, setFullName] = useState('')
  const [sex, setSex] = useState<Sex | ''>('')
  const [dob, setDob] = useState('')

  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm')
  const [heightCm, setHeightCm] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')

  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [currentWeight, setCurrentWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')

  const [goalType, setGoalType] = useState<GoalType | ''>('')
  const [goalMode, setGoalMode] = useState<GoalMode>('rate')
  const [rate, setRate] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('')
  const [workoutFrequency, setWorkoutFrequency] = useState<
    WorkoutFrequency | ''
  >('')

  const [dietPreset, setDietPreset] = useState<DietPreset>('none')
  const [dietOther, setDietOther] = useState('')
  const [foodPrefs, setFoodPrefs] = useState<FoodPreferences>({})

  // ---- derive metric values ----
  const heightCmNum = useMemo(() => {
    if (heightUnit === 'cm') return n(heightCm)
    const ft = n(heightFt)
    const inch = n(heightIn)
    if (Number.isNaN(ft) && Number.isNaN(inch)) return NaN
    return ftInToCm(ft || 0, inch || 0)
  }, [heightUnit, heightCm, heightFt, heightIn])

  const toKg = (v: number) => (weightUnit === 'kg' ? v : lbToKg(v))
  const currentWeightKg = useMemo(() => {
    const v = n(currentWeight)
    return Number.isNaN(v) ? NaN : toKg(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeight, weightUnit])
  const targetWeightKg = useMemo(() => {
    const v = n(targetWeight)
    return Number.isNaN(v) ? NaN : toKg(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWeight, weightUnit])

  const age = useMemo(() => (dob ? ageFromDob(dob) : NaN), [dob])

  // Weekly rate in kg (the canonical unit), derived from whichever input the
  // user chose. Maintain goals are always zero.
  const rateKgPerWeek = useMemo(() => {
    if (goalType === 'maintain') return 0
    if (goalMode === 'rate') {
      const v = n(rate)
      if (Number.isNaN(v)) return NaN
      return Math.abs(toKg(v))
    }
    if (
      !targetDate ||
      Number.isNaN(currentWeightKg) ||
      Number.isNaN(targetWeightKg)
    )
      return NaN
    return (
      rateFromTargetDate(currentWeightKg, targetWeightKg, targetDate) ?? NaN
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalType, goalMode, rate, targetDate, currentWeightKg, targetWeightKg, weightUnit])

  // The "calculate the other" reciprocal value shown to the user.
  const reciprocal = useMemo(() => {
    if (goalType === 'maintain') return null
    if (goalMode === 'rate') {
      if (
        Number.isNaN(rateKgPerWeek) ||
        rateKgPerWeek <= 0 ||
        Number.isNaN(currentWeightKg) ||
        Number.isNaN(targetWeightKg)
      )
        return null
      const d = targetDateFromRate(currentWeightKg, targetWeightKg, rateKgPerWeek)
      return d
        ? `Reaches target around ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : null
    }
    if (Number.isNaN(rateKgPerWeek) || rateKgPerWeek <= 0) return null
    const shown =
      weightUnit === 'kg' ? rateKgPerWeek : kgToLb(rateKgPerWeek)
    return `That's about ${shown.toFixed(2)} ${weightUnit}/week`
  }, [goalType, goalMode, rateKgPerWeek, currentWeightKg, targetWeightKg, weightUnit])

  const rateTooFast = useMemo(() => {
    if (
      goalType === 'maintain' ||
      Number.isNaN(rateKgPerWeek) ||
      Number.isNaN(currentWeightKg) ||
      rateKgPerWeek <= 0
    )
      return false
    return isRateTooFast(rateKgPerWeek, currentWeightKg)
  }, [goalType, rateKgPerWeek, currentWeightKg])

  const maxRateLabel = useMemo(() => {
    if (Number.isNaN(currentWeightKg)) return null
    const maxKg = maxWeeklyRateKg(currentWeightKg)
    const shown = weightUnit === 'kg' ? maxKg : kgToLb(maxKg)
    return `${shown.toFixed(2)} ${weightUnit}/week`
  }, [currentWeightKg, weightUnit])

  // ---- live targets ----
  const targets = useMemo(() => {
    if (
      !sex ||
      !goalType ||
      !activityLevel ||
      !workoutFrequency ||
      Number.isNaN(heightCmNum) ||
      Number.isNaN(currentWeightKg) ||
      Number.isNaN(targetWeightKg) ||
      Number.isNaN(age) ||
      age <= 0
    ) {
      return null
    }
    const effRate =
      goalType === 'maintain'
        ? 0
        : Number.isNaN(rateKgPerWeek)
          ? 0
          : rateKgPerWeek
    return computeTargets({
      sex,
      weightKg: currentWeightKg,
      heightCm: heightCmNum,
      age,
      goalType,
      targetWeightKg,
      rateKgPerWeek: effRate,
      activityLevel,
      workoutFrequency,
    })
  }, [
    sex,
    goalType,
    activityLevel,
    workoutFrequency,
    heightCmNum,
    currentWeightKg,
    targetWeightKg,
    age,
    rateKgPerWeek,
  ])

  const dietaryRestriction =
    dietPreset === 'other' ? dietOther : dietPreset === 'none' ? '' : dietPreset

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* Hidden canonical (metric) values submitted to the server. */}
      <input type="hidden" name="full_name" value={fullName} />
      <input type="hidden" name="sex" value={sex} />
      <input type="hidden" name="date_of_birth" value={dob} />
      <input
        type="hidden"
        name="height_cm"
        value={Number.isNaN(heightCmNum) ? '' : heightCmNum.toFixed(1)}
      />
      <input
        type="hidden"
        name="current_weight_kg"
        value={Number.isNaN(currentWeightKg) ? '' : currentWeightKg.toFixed(2)}
      />
      <input type="hidden" name="goal_type" value={goalType} />
      <input
        type="hidden"
        name="target_weight_kg"
        value={Number.isNaN(targetWeightKg) ? '' : targetWeightKg.toFixed(2)}
      />
      <input
        type="hidden"
        name="target_rate_kg_per_week"
        value={Number.isNaN(rateKgPerWeek) ? '0' : rateKgPerWeek.toFixed(3)}
      />
      <input type="hidden" name="activity_level" value={activityLevel} />
      <input type="hidden" name="workout_frequency" value={workoutFrequency} />
      <input type="hidden" name="dietary_restriction" value={dietaryRestriction} />
      <input
        type="hidden"
        name="food_preferences"
        value={JSON.stringify(foodPrefs)}
      />

      {/* Identity */}
      <Section title="About you">
        <Field label="Full name">
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </Field>

        <Field label="Sex">
          <OptionGroup
            value={sex}
            onChange={setSex}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
        </Field>

        <Field label="Date of birth">
          <input
            type="date"
            className="input"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </Field>

        <Field
          label="Height"
          action={
            <UnitToggle
              value={heightUnit}
              onChange={setHeightUnit}
              options={[
                { value: 'cm', label: 'cm' },
                { value: 'ftin', label: 'ft / in' },
              ]}
            />
          }
        >
          {heightUnit === 'cm' ? (
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="175"
            />
          ) : (
            <div className="flex gap-3">
              <input
                className="input w-full"
                type="number"
                inputMode="numeric"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                placeholder="ft"
              />
              <input
                className="input w-full"
                type="number"
                inputMode="numeric"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                placeholder="in"
              />
            </div>
          )}
        </Field>

        <Field
          label="Current weight"
          action={
            <UnitToggle
              value={weightUnit}
              onChange={setWeightUnit}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          }
        >
          <input
            className="input"
            type="number"
            inputMode="decimal"
            value={currentWeight}
            onChange={(e) => setCurrentWeight(e.target.value)}
            placeholder={weightUnit === 'kg' ? '75' : '165'}
          />
        </Field>
      </Section>

      {/* Goal */}
      <Section title="Your goal">
        <Field label="I want to">
          <OptionGroup
            value={goalType}
            onChange={setGoalType}
            options={[
              { value: 'lose', label: 'Lose weight' },
              { value: 'maintain', label: 'Maintain' },
              { value: 'gain', label: 'Gain weight' },
            ]}
          />
        </Field>

        <Field label={`Target weight (${weightUnit})`}>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder={weightUnit === 'kg' ? '70' : '154'}
          />
        </Field>

        {goalType !== 'maintain' && (
          <Field
            label="Pace"
            action={
              <UnitToggle
                value={goalMode}
                onChange={setGoalMode}
                options={[
                  { value: 'rate', label: 'By rate' },
                  { value: 'date', label: 'By date' },
                ]}
              />
            }
          >
            {goalMode === 'rate' ? (
              <input
                className="input"
                type="number"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={`${weightUnit}/week (e.g. ${weightUnit === 'kg' ? '0.5' : '1'})`}
              />
            ) : (
              <input
                className="input"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            )}
            {reciprocal && (
              <p className="mt-1.5 text-xs text-muted">{reciprocal}</p>
            )}
            {rateTooFast && maxRateLabel && (
              <p className="mt-1.5 text-xs text-warning">
                That pace is aggressive. We recommend capping at ~1% of
                bodyweight per week ({maxRateLabel}).
              </p>
            )}
          </Field>
        )}
      </Section>

      {/* Activity */}
      <Section title="Activity">
        <Field label="Daily lifestyle">
          <OptionGroup
            value={activityLevel}
            onChange={setActivityLevel}
            columns
            options={(
              Object.keys(ACTIVITY_LABELS) as ActivityLevel[]
            ).map((k) => ({ value: k, label: ACTIVITY_LABELS[k] }))}
          />
        </Field>

        <Field label="Workout frequency">
          <OptionGroup
            value={workoutFrequency}
            onChange={setWorkoutFrequency}
            options={(
              Object.keys(WORKOUT_LABELS) as WorkoutFrequency[]
            ).map((k) => ({ value: k, label: WORKOUT_LABELS[k] }))}
          />
        </Field>
      </Section>

      {/* Diet */}
      <Section title="Diet">
        <Field label="Dietary restriction">
          <OptionGroup
            value={dietPreset}
            onChange={setDietPreset}
            options={[
              { value: 'none', label: 'None' },
              { value: 'halal', label: 'Halal' },
              { value: 'vegetarian', label: 'Vegetarian' },
              { value: 'vegan', label: 'Vegan' },
              { value: 'other', label: 'Other' },
            ]}
          />
          {dietPreset === 'other' && (
            <input
              className="input mt-3"
              value={dietOther}
              onChange={(e) => setDietOther(e.target.value)}
              placeholder="Describe your restriction"
            />
          )}
        </Field>

      </Section>

      <Section title="Food preferences">
        <p className="text-sm text-muted">
          Pick the one you reach for more often. This tailors your meal-photo
          estimates — there are no wrong answers.
        </p>
        <PreferencePicker value={foodPrefs} onChange={setFoodPrefs} />
      </Section>

      {/* Live plan preview — the payoff moment */}
      <PlanPreview
        targets={targets}
        goalType={goalType || 'maintain'}
      />

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
        {pending ? 'Saving…' : 'Save my plan'}
      </button>
    </form>
  )
}

/* ---------- presentational helpers ---------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {action}
      </div>
      {children}
    </div>
  )
}

function chipClass(active: boolean) {
  return `rounded-lg border px-3.5 py-2 text-sm transition-colors ${
    active
      ? 'border-accent bg-[var(--accent-soft)] text-foreground'
      : 'border-border bg-surface-2 text-muted hover:text-foreground'
  }`
}

function OptionGroup<T extends string>({
  value,
  onChange,
  options,
  columns,
}: {
  value: T | ''
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  columns?: boolean
}) {
  return (
    <div className={columns ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-2'}>
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={chipClass(active)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function UnitToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs transition-colors ${
            value === opt.value
              ? 'bg-accent text-white'
              : 'bg-surface-2 text-muted hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function PlanPreview({
  targets,
  goalType,
}: {
  targets: ReturnType<typeof computeTargets> | null
  goalType: GoalType
}) {
  return (
    <section className="rounded-2xl border border-accent/40 bg-[var(--accent-soft)] p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-accent">
        Your plan
      </h2>
      {!targets ? (
        <p className="text-sm text-muted">
          Fill in the details above and your personalized targets appear here
          instantly.
        </p>
      ) : (
        <>
          <div className="mb-5 flex items-end gap-2">
            <span className="text-4xl font-bold text-foreground">
              {targets.calories.toLocaleString()}
            </span>
            <span className="mb-1 text-sm text-muted">kcal / day</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Macro label="Protein" value={`${targets.proteinG}g`} />
            <Macro label="Carbs" value={`${targets.carbG}g`} />
            <Macro label="Fat" value={`${targets.fatG}g`} />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
            <span>BMR {targets.bmr.toLocaleString()} kcal</span>
            <span>TDEE {targets.tdee.toLocaleString()} kcal</span>
            <span className="capitalize">Goal: {goalType}</span>
          </div>
        </>
      )}
    </section>
  )
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
