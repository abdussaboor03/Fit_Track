'use client'

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ageFromDob,
  computeTargets,
  ftInToCm,
  isRateTooFast,
  kgToLb,
  lbToKg,
  maxWeeklyRateKg,
  rateFromTargetDate,
  targetDateFromRate,
} from '@/lib/fitness/calc'
import { FOOD_PREFERENCE_PAIRS } from '@/lib/fitness/preferences'
import type {
  ActivityLevel,
  FoodPreferences,
  GoalType,
  Sex,
  WorkoutFrequency,
} from '@/lib/fitness/types'
import { saveProfile, type OnboardingState } from './actions'

type WeightUnit = 'kg' | 'lb'
type HeightUnit = 'cm' | 'ftin'
type GoalMode = 'rate' | 'date'
type DietPreset = 'none' | 'halal' | 'vegetarian' | 'vegan' | 'other'
type Screen = 'hero' | 'identity' | 'goal' | 'activity' | 'food' | 'reveal'

const STEPS: Screen[] = ['identity', 'goal', 'activity', 'food']

const n = (v: string) => (v.trim() === '' ? NaN : Number(v))

/* ---------------------------------------------------------------------------
   Static presentation data (lifestyle / workout / diet / quiz).
--------------------------------------------------------------------------- */
const ACTIVITY: { k: ActivityLevel; title: string; hint: string }[] = [
  { k: 'sedentary', title: 'Sedentary', hint: 'Desk job, little movement' },
  {
    k: 'lightly_active',
    title: 'Lightly active',
    hint: 'On your feet some of the day',
  },
  { k: 'active', title: 'Active', hint: 'Physical job or lots of walking' },
  { k: 'very_active', title: 'Very active', hint: 'Labor-intensive' },
]
const WORKOUTS: { k: WorkoutFrequency; big: string; sub: string }[] = [
  { k: 'none', big: '0', sub: "Don't train" },
  { k: '1-2', big: '1–2', sub: 'per week' },
  { k: '3-4', big: '3–4', sub: 'per week' },
  { k: '5+', big: '5+', sub: 'per week' },
]
const DIETS: { v: DietPreset; label: string }[] = [
  { v: 'none', label: 'None' },
  { v: 'halal', label: 'Halal' },
  { v: 'vegetarian', label: 'Vegetarian' },
  { v: 'vegan', label: 'Vegan' },
  { v: 'other', label: 'Other' },
]
const GOALS: { v: GoalType; title: string; sub: string }[] = [
  { v: 'lose', title: 'Lose weight', sub: 'Trim down in a deficit' },
  { v: 'maintain', title: 'Maintain', sub: 'Hold steady at your weight' },
  { v: 'gain', title: 'Gain weight', sub: 'Build up in a surplus' },
]

// Prompt copy for the taste-test, keyed by the shared pair ids. Kept local so
// the shared FOOD_PREFERENCE_PAIRS (used elsewhere) stays presentation-free.
const QUIZ_PROMPTS: Record<string, string> = {
  protein: 'Go-to protein?',
  meat: 'Which do you reach for?',
  carb: 'Your carb of choice',
  produce: 'More often, it’s...',
  dairy: 'Dairy pick',
  nuts: 'Snack on...',
  spice: 'Flavor profile',
  style: 'How’s it cooked?',
}
const promptFor = (id: string) => QUIZ_PROMPTS[id] ?? 'Which do you prefer?'

/* ---------------------------------------------------------------------------
   Selection-state style helpers (ported from the design's DCLogic styles).
--------------------------------------------------------------------------- */
function cardStyle(active: boolean, extra?: CSSProperties): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    width: '100%',
    padding: '15px 16px',
    borderRadius: 14,
    cursor: 'pointer',
    font: 'inherit',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active
      ? 'linear-gradient(180deg,color-mix(in srgb,var(--accent) 18%,transparent),color-mix(in srgb,var(--accent) 5%,transparent))'
      : 'var(--surface-2)',
    color: active ? 'var(--fg)' : 'var(--muted)',
    boxShadow: active
      ? '0 0 0 1px var(--accent),0 10px 34px -14px var(--accent-glow)'
      : 'none',
    transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
    ...extra,
  }
}
function centerCard(active: boolean): CSSProperties {
  return cardStyle(active, {
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 3,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 700,
  })
}
function segStyle(active: boolean): CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 12.5,
    fontWeight: 600,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    boxShadow: active ? '0 2px 10px -3px var(--accent-glow)' : 'none',
    transition: 'all .15s ease',
  }
}
function pillStyle(active: boolean): CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 999,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
    color: active ? 'var(--fg)' : 'var(--muted)',
    boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
    transition: 'all .16s cubic-bezier(.2,.8,.2,1)',
  }
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 15px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  fontSize: 15,
  outline: 'none',
}
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 600 }
const segWrap: CSSProperties = {
  display: 'inline-flex',
  padding: 3,
  borderRadius: 10,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  gap: 2,
}
const h1Style: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 700,
  letterSpacing: '-.03em',
}

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    saveProfile,
    undefined,
  )

  const [screen, setScreen] = useState<Screen>('hero')
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')

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
  const [quizIndex, setQuizIndex] = useState(0)

  /* ---- derived metric values (canonical units) ---- */
  const heightCmNum = useMemo(() => {
    if (heightUnit === 'cm') return n(heightCm)
    const ft = n(heightFt)
    const inch = n(heightIn)
    if (Number.isNaN(ft) && Number.isNaN(inch)) return NaN
    return ftInToCm(ft || 0, inch || 0)
  }, [heightUnit, heightCm, heightFt, heightIn])

  const toKg = useCallback(
    (v: number) => (weightUnit === 'kg' ? v : lbToKg(v)),
    [weightUnit],
  )
  const currentWeightKg = useMemo(() => {
    const v = n(currentWeight)
    return Number.isNaN(v) ? NaN : toKg(v)
  }, [currentWeight, toKg])
  const targetWeightKg = useMemo(() => {
    const v = n(targetWeight)
    return Number.isNaN(v) ? NaN : toKg(v)
  }, [targetWeight, toKg])

  const age = useMemo(() => (dob ? ageFromDob(dob) : NaN), [dob])

  const rateKgPerWeek = useMemo(() => {
    if (goalType === 'maintain') return 0
    if (goalMode === 'rate') {
      const v = n(rate)
      return Number.isNaN(v) ? NaN : Math.abs(toKg(v))
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
  }, [
    goalType,
    goalMode,
    rate,
    targetDate,
    currentWeightKg,
    targetWeightKg,
    toKg,
  ])

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
      goalType === 'maintain' || Number.isNaN(rateKgPerWeek) ? 0 : rateKgPerWeek
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

  /* ---- reciprocal + rate warning (goal step) ---- */
  const { reciprocalText, rateTooFast, warningText } = useMemo(() => {
    let reciprocalText = ''
    if (
      goalType !== 'maintain' &&
      !Number.isNaN(rateKgPerWeek) &&
      rateKgPerWeek > 0
    ) {
      if (
        goalMode === 'rate' &&
        !Number.isNaN(currentWeightKg) &&
        !Number.isNaN(targetWeightKg)
      ) {
        const d = targetDateFromRate(
          currentWeightKg,
          targetWeightKg,
          rateKgPerWeek,
        )
        if (d) {
          reciprocalText = `Reaches target around ${d.toLocaleDateString(
            undefined,
            { month: 'short', day: 'numeric', year: 'numeric' },
          )}`
        }
      } else if (goalMode === 'date') {
        const shown = weightUnit === 'kg' ? rateKgPerWeek : kgToLb(rateKgPerWeek)
        reciprocalText = `That's about ${shown.toFixed(2)} ${weightUnit}/week`
      }
    }
    let rateTooFast = false
    let warningText = ''
    if (
      goalType !== 'maintain' &&
      !Number.isNaN(rateKgPerWeek) &&
      rateKgPerWeek > 0 &&
      !Number.isNaN(currentWeightKg) &&
      isRateTooFast(rateKgPerWeek, currentWeightKg)
    ) {
      rateTooFast = true
      const mx = maxWeeklyRateKg(currentWeightKg)
      const shown = (weightUnit === 'kg' ? mx : kgToLb(mx)).toFixed(2)
      warningText = `That pace is aggressive. We recommend capping at ~1% of bodyweight per week (${shown} ${weightUnit}/week).`
    }
    return { reciprocalText, rateTooFast, warningText }
  }, [
    goalType,
    goalMode,
    rateKgPerWeek,
    currentWeightKg,
    targetWeightKg,
    weightUnit,
  ])

  const trend = useMemo(
    () =>
      buildTrend({
        goalType,
        currentWeightKg,
        targetWeightKg,
        rateKgPerWeek,
        weightUnit,
      }),
    [goalType, currentWeightKg, targetWeightKg, rateKgPerWeek, weightUnit],
  )

  /* ---- validation / navigation ---- */
  const identityValid =
    !!fullName.trim() &&
    !!sex &&
    !!dob &&
    age > 0 &&
    age < 120 &&
    heightCmNum > 0 &&
    currentWeightKg > 0
  const goalValid = !!goalType && targetWeightKg > 0
  const activityValid = !!activityLevel && !!workoutFrequency
  const canAdvance =
    screen === 'identity'
      ? identityValid
      : screen === 'goal'
        ? goalValid
        : screen === 'activity'
          ? activityValid
          : true

  const goNext = () => {
    if (!canAdvance) return
    const i = STEPS.indexOf(screen as Screen)
    const next =
      i < 0 ? 'identity' : i === STEPS.length - 1 ? 'reveal' : STEPS[i + 1]
    setDir('fwd')
    setScreen(next)
  }
  const goBack = () => {
    if (screen === 'reveal') {
      setDir('back')
      setScreen('food')
      return
    }
    const i = STEPS.indexOf(screen as Screen)
    setDir('back')
    setScreen(i <= 0 ? 'hero' : STEPS[i - 1])
  }
  const startFlow = () => {
    setDir('fwd')
    setScreen('identity')
  }

  /* ---- reveal count choreography ---- */
  const targetsRef = useRef(targets)
  useEffect(() => {
    targetsRef.current = targets
  }, [targets])

  const rafRef = useRef<number | null>(null)
  const [disp, setDisp] = useState({ cal: 0, pro: 0, carb: 0, fat: 0 })
  const [countDone, setCountDone] = useState(false)
  const [revealPhase, setRevealPhase] = useState<'base' | 'sub' | 'done'>('base')
  const [showDelta, setShowDelta] = useState(false)

  useEffect(() => {
    if (screen !== 'reveal') return
    const t = targetsRef.current
    if (!t) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const tdee = t.tdee
    const target = t.calories
    const delta = tdee - target
    const hasDelta = Math.abs(delta) >= 1
    setDisp({ cal: 0, pro: 0, carb: 0, fat: 0 })
    setCountDone(false)
    setRevealPhase('base')
    setShowDelta(false)

    const ease = (x: number) => 1 - Math.pow(1 - x, 3)
    const tA = 640
    const hold = 520
    const tC = 940
    const start = performance.now()

    const tick = (now: number) => {
      const el = now - start
      if (!hasDelta) {
        const p = Math.min(1, el / 1150)
        const e = ease(p)
        if (p < 1) {
          setDisp({
            cal: target * e,
            pro: t.proteinG * e,
            carb: t.carbG * e,
            fat: t.fatG * e,
          })
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        setDisp({ cal: target, pro: t.proteinG, carb: t.carbG, fat: t.fatG })
        setCountDone(true)
        setRevealPhase('done')
        return
      }
      if (el < tA) {
        const e = ease(el / tA)
        setDisp({ cal: tdee * e, pro: 0, carb: 0, fat: 0 })
        setRevealPhase('base')
      } else if (el < tA + hold) {
        setDisp((d) => ({ ...d, cal: tdee }))
        setRevealPhase('base')
        setShowDelta(el > tA + 170)
      } else if (el < tA + hold + tC) {
        const e = ease((el - tA - hold) / tC)
        setRevealPhase('sub')
        setShowDelta(true)
        setDisp({
          cal: tdee + (target - tdee) * e,
          pro: t.proteinG * e,
          carb: t.carbG * e,
          fat: t.fatG * e,
        })
      } else {
        setDisp({ cal: target, pro: t.proteinG, carb: t.carbG, fat: t.fatG })
        setCountDone(true)
        setRevealPhase('done')
        setShowDelta(true)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [screen])

  /* ---- food taste-test: swipeable card physics ---- */
  const cardRef = useRef<HTMLDivElement | null>(null)
  const stampLRef = useRef<HTMLSpanElement | null>(null)
  const stampRRef = useRef<HTMLSpanElement | null>(null)
  const dragRef = useRef<{ x0: number; dx: number } | null>(null)
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = FOOD_PREFERENCE_PAIRS.length
  const pair = FOOD_PREFERENCE_PAIRS[quizIndex] ?? null

  const choosePair = useCallback(
    (side: 'a' | 'b') => {
      const p = FOOD_PREFERENCE_PAIRS[quizIndex]
      if (!p) return
      const val = side === 'a' ? p.a.value : p.b.value
      setFoodPrefs((prev) => ({ ...prev, [p.id]: val }))
      setQuizIndex((i) => i + 1)
      const card = cardRef.current
      if (!card) return
      card.style.transition = 'none'
      card.style.opacity = '0'
      card.style.transform = 'translateY(18px) scale(.95)'
      if (stampLRef.current) stampLRef.current.style.opacity = '0'
      if (stampRRef.current) stampRRef.current.style.opacity = '0'
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const c = cardRef.current
          if (!c) return
          c.style.transition =
            'transform .36s cubic-bezier(.2,.9,.3,1),opacity .36s'
          c.style.transform = 'translateY(0) scale(1)'
          c.style.opacity = '1'
        }),
      )
    },
    [quizIndex],
  )

  const flyChoose = useCallback(
    (side: 'a' | 'b') => {
      const card = cardRef.current
      const dir = side === 'b' ? 1 : -1
      if (card) {
        card.style.transition =
          'transform .32s cubic-bezier(.3,.6,.3,1),opacity .32s'
        card.style.transform = `translateX(${dir * 560}px) rotate(${dir * 16}deg)`
        card.style.opacity = '0'
      }
      if (flyTimer.current) clearTimeout(flyTimer.current)
      flyTimer.current = setTimeout(() => choosePair(side), 200)
    },
    [choosePair],
  )

  // Detaches whatever window listeners the active drag installed. Held in a ref
  // so unmount-mid-drag can clean up without the handlers referencing each other.
  const detachDragRef = useRef<(() => void) | null>(null)

  const onCardDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const card = cardRef.current
      if (!card) return
      dragRef.current = { x0: e.clientX, dx: 0 }
      card.style.transition = 'none'
      card.style.cursor = 'grabbing'

      const move = (ev: globalThis.PointerEvent) => {
        if (!dragRef.current) return
        const dx = ev.clientX - dragRef.current.x0
        dragRef.current.dx = dx
        const c = cardRef.current
        if (!c) return
        c.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`
        const k = Math.min(1, Math.abs(dx) / 110)
        if (stampLRef.current)
          stampLRef.current.style.opacity = dx < -6 ? `${k}` : '0'
        if (stampRRef.current)
          stampRRef.current.style.opacity = dx > 6 ? `${k}` : '0'
      }
      const up = () => {
        detachDragRef.current?.()
        const d = dragRef.current
        dragRef.current = null
        const c = cardRef.current
        if (!c) return
        c.style.cursor = 'grab'
        const dx = d ? d.dx : 0
        if (Math.abs(dx) > 86) {
          flyChoose(dx > 0 ? 'b' : 'a')
          return
        }
        c.style.transition = 'transform .4s cubic-bezier(.2,.9,.3,1)'
        c.style.transform = 'translateX(0) rotate(0deg)'
        if (stampLRef.current) stampLRef.current.style.opacity = '0'
        if (stampRRef.current) stampRRef.current.style.opacity = '0'
      }

      detachDragRef.current = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        detachDragRef.current = null
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [flyChoose],
  )

  useEffect(() => {
    return () => {
      detachDragRef.current?.()
      if (flyTimer.current) clearTimeout(flyTimer.current)
    }
  }, [])

  /* ---- misc derived view values ---- */
  const wu = weightUnit
  const stepIdx = STEPS.indexOf(screen as Screen)
  const isReveal = screen === 'reveal'
  const progressStep = isReveal ? 4 : Math.max(0, stepIdx) + (stepIdx >= 0 ? 1 : 0)
  const progressPct = isReveal
    ? 100
    : stepIdx >= 0
      ? (stepIdx / STEPS.length) * 100 + 6
      : 0
  const enterAnim = dir === 'back' ? 'depthBack' : 'depthIn'
  const stepAnimStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
    animation: `${enterAnim} .42s cubic-bezier(.2,.8,.2,1) both`,
  }
  const notMaintain = !!goalType && goalType !== 'maintain'

  const dietaryRestriction =
    dietPreset === 'other' ? dietOther : dietPreset === 'none' ? '' : dietPreset

  // Reveal figures.
  const ft = targets ?? {
    proteinG: 0,
    carbG: 0,
    fatG: 0,
    bmr: 0,
    tdee: 0,
    calories: 0,
  }
  const pCal = ft.proteinG * 4
  const cCal = ft.carbG * 4
  const fCal = ft.fatG * 9
  const totCal = Math.max(1, pCal + cCal + fCal)
  const revealDelta = ft.tdee - ft.calories
  const revealDeficit = revealDelta > 0

  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Prevent an Enter keypress in a mid-flow input from submitting the form;
    // advance instead. The reveal step keeps normal submit behavior.
    if (e.key !== 'Enter' || isReveal) return
    const el = e.target as HTMLElement
    if (el.tagName === 'INPUT') {
      e.preventDefault()
      if (screen !== 'hero') goNext()
    }
  }

  return (
    <form
      action={formAction}
      onKeyDown={onFormKeyDown}
      className="ob"
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--bg)',
      }}
    >
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

      {/* Ambient background */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-12%',
            left: '-8%',
            width: 540,
            height: 540,
            borderRadius: '50%',
            background:
              'radial-gradient(circle,var(--accent-glow),transparent 65%)',
            filter: 'blur(64px)',
            animation: 'ambientFloat 15s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-16%',
            right: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(circle,rgba(255,106,77,.18),transparent 65%)',
            filter: 'blur(74px)',
            animation: 'ambientFloat2 19s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '38%',
            right: '22%',
            width: 340,
            height: 340,
            borderRadius: '50%',
            background:
              'radial-gradient(circle,rgba(52,211,153,.12),transparent 65%)',
            filter: 'blur(70px)',
            animation: 'ambientFloat3 22s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% -8%,var(--accent-soft),transparent 55%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg,transparent 60%,rgba(0,0,0,.4))',
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 468,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 22px 34px',
        }}
      >
        {/* Progress header */}
        {screen !== 'hero' && (
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 13,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 14px var(--accent)',
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '-.02em',
                  }}
                >
                  FitTrack
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '.16em',
                  color: 'var(--muted)',
                }}
              >
                {isReveal ? 'COMPLETE' : `STEP ${progressStep} OF 4`}
              </span>
            </div>
            <div
              style={{
                position: 'relative',
                height: 8,
                borderRadius: 999,
                background: 'var(--surface-2)',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  boxShadow: '0 0 18px var(--accent-glow)',
                  transition: 'width .75s cubic-bezier(.2,.9,.15,1)',
                  width: `${progressPct}%`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '38%',
                    background:
                      'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)',
                    animation: 'shimmer 2.6s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ============ HERO ============ */}
        {screen === 'hero' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 26,
              padding: '20px 0 40px',
              animation: 'riseIn .6s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 16px var(--accent)',
                }}
              />
              <span
                style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em' }}
              >
                FitTrack
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '.2em',
                  color: 'var(--accent)',
                  marginBottom: 16,
                }}
              >
                LET&apos;S BUILD YOUR PLAN
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 44,
                  lineHeight: 1.02,
                  fontWeight: 700,
                  letterSpacing: '-.03em',
                }}
              >
                Your day,
                <br />
                dialed&nbsp;in.
              </h1>
              <p
                style={{
                  margin: '20px 0 0',
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: 'var(--muted)',
                  maxWidth: 340,
                }}
              >
                Five quick steps. At the end, a calorie and macro target built
                around{' '}
                <em
                  style={{
                    color: 'var(--fg)',
                    fontStyle: 'normal',
                    fontWeight: 600,
                  }}
                >
                  you
                </em>{' '}
                — not a generic chart.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
              <HeroStat value="~90s" label="to set up" color="var(--accent)" />
              <HeroStat value="Live" label="macro math" color="var(--green)" />
              <HeroStat value="You" label="shaped it" color="var(--coral)" />
            </div>
            <button
              type="button"
              onClick={startFlow}
              className="ob-primary"
              style={{
                marginTop: 8,
                width: '100%',
                padding: 17,
                border: 'none',
                borderRadius: 16,
                background:
                  'linear-gradient(135deg,var(--accent),var(--accent-2))',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '-.01em',
                cursor: 'pointer',
                boxShadow:
                  '0 12px 40px -10px var(--accent-glow),inset 0 1px 0 rgba(255,255,255,.2)',
              }}
            >
              Start &nbsp;→
            </button>
          </div>
        )}

        {/* ============ IDENTITY ============ */}
        {screen === 'identity' && (
          <div style={stepAnimStyle}>
            <div>
              <h1 style={h1Style}>Let&apos;s start with you</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--muted)' }}>
                The basics we need to size your plan.
              </p>
            </div>

            <FieldCol delay={0.05}>
              <label style={labelStyle}>Full name</label>
              <input
                className="ob-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </FieldCol>

            <FieldCol delay={0.1} gap={9}>
              <label style={labelStyle}>Sex</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                {(['male', 'female'] as Sex[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSex(v)}
                    className="ob-press"
                    style={centerCard(sex === v)}
                  >
                    {v === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </FieldCol>

            <FieldCol delay={0.15}>
              <label style={labelStyle}>Date of birth</label>
              <input
                type="date"
                className="ob-input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={{ ...inputStyle, padding: '13px 15px' }}
              />
            </FieldCol>

            <FieldCol delay={0.2}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <label style={labelStyle}>Height</label>
                <div style={segWrap}>
                  {(
                    [
                      { v: 'cm', label: 'cm' },
                      { v: 'ftin', label: 'ft / in' },
                    ] as { v: HeightUnit; label: string }[]
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setHeightUnit(o.v)}
                      style={segStyle(heightUnit === o.v)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {heightUnit === 'cm' ? (
                <input
                  type="number"
                  inputMode="decimal"
                  className="ob-input"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                  style={inputStyle}
                />
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="ob-input"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    placeholder="ft"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    className="ob-input"
                    value={heightIn}
                    onChange={(e) => setHeightIn(e.target.value)}
                    placeholder="in"
                    style={inputStyle}
                  />
                </div>
              )}
            </FieldCol>

            <FieldCol delay={0.25}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <label style={labelStyle}>Current weight</label>
                <div style={segWrap}>
                  {(
                    [
                      { v: 'kg', label: 'kg' },
                      { v: 'lb', label: 'lb' },
                    ] as { v: WeightUnit; label: string }[]
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setWeightUnit(o.v)}
                      style={segStyle(weightUnit === o.v)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                inputMode="decimal"
                className="ob-input"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder={wu === 'kg' ? '75' : '165'}
                style={inputStyle}
              />
            </FieldCol>
          </div>
        )}

        {/* ============ GOAL ============ */}
        {screen === 'goal' && (
          <div style={stepAnimStyle}>
            <div>
              <h1 style={h1Style}>What are you working toward?</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--muted)' }}>
                Pick a direction and how hard to push.
              </p>
            </div>

            <FieldCol delay={0.05} gap={10}>
              {GOALS.map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setGoalType(g.v)}
                  className="ob-press-sm"
                  style={cardStyle(goalType === g.v)}
                >
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: '-.01em',
                        color: 'var(--fg)',
                      }}
                    >
                      {g.title}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {g.sub}
                    </span>
                  </span>
                </button>
              ))}
            </FieldCol>

            <FieldCol delay={0.15}>
              <label style={labelStyle}>Target weight ({wu})</label>
              <input
                type="number"
                inputMode="decimal"
                className="ob-input"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={wu === 'kg' ? '70' : '154'}
                style={inputStyle}
              />
            </FieldCol>

            {notMaintain && (
              <>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    animation: 'riseIn .4s both',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <label style={labelStyle}>Pace</label>
                    <div style={segWrap}>
                      {(
                        [
                          { v: 'rate', label: 'By rate' },
                          { v: 'date', label: 'By date' },
                        ] as { v: GoalMode; label: string }[]
                      ).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setGoalMode(o.v)}
                          style={segStyle(goalMode === o.v)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {goalMode === 'rate' ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      className="ob-input"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder={`${wu}/week (e.g. ${wu === 'kg' ? '0.5' : '1'})`}
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      type="date"
                      className="ob-input"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      style={{ ...inputStyle, padding: '13px 15px' }}
                    />
                  )}
                  {reciprocalText && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 12.5,
                        color: 'var(--muted)',
                      }}
                    >
                      {reciprocalText}
                    </p>
                  )}
                  {rateTooFast && (
                    <div
                      style={{
                        marginTop: 4,
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        padding: '12px 13px',
                        borderRadius: 12,
                        background: 'color-mix(in srgb,var(--amber) 12%,transparent)',
                        border:
                          '1px solid color-mix(in srgb,var(--amber) 40%,transparent)',
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 7,
                          height: 7,
                          marginTop: 6,
                          borderRadius: '50%',
                          background: 'var(--amber)',
                          boxShadow: '0 0 10px var(--amber)',
                        }}
                      />
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          color: 'var(--amber)',
                        }}
                      >
                        {warningText}
                      </p>
                    </div>
                  )}
                </div>

                <TrendChart trend={trend} />
              </>
            )}
          </div>
        )}

        {/* ============ ACTIVITY ============ */}
        {screen === 'activity' && (
          <div style={{ ...stepAnimStyle, gap: 24 }}>
            <div>
              <h1 style={h1Style}>How do you move?</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--muted)' }}>
                This scales your burn on top of the baseline.
              </p>
            </div>

            <FieldCol delay={0.05} gap={10}>
              <label style={labelStyle}>Daily lifestyle</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {ACTIVITY.map((a) => (
                  <button
                    key={a.k}
                    type="button"
                    onClick={() => setActivityLevel(a.k)}
                    className="ob-press-sm"
                    style={cardStyle(activityLevel === a.k)}
                  >
                    <span
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--fg)',
                        }}
                      >
                        {a.title}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {a.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </FieldCol>

            <FieldCol delay={0.15} gap={10}>
              <label style={labelStyle}>Workout frequency</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 9,
                }}
              >
                {WORKOUTS.map((w) => (
                  <button
                    key={w.k}
                    type="button"
                    onClick={() => setWorkoutFrequency(w.k)}
                    className="ob-press"
                    style={centerCard(workoutFrequency === w.k)}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: 'var(--fg)',
                        letterSpacing: '-.02em',
                      }}
                    >
                      {w.big}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {w.sub}
                    </span>
                  </button>
                ))}
              </div>
            </FieldCol>
          </div>
        )}

        {/* ============ FOOD ============ */}
        {screen === 'food' && (
          <div style={stepAnimStyle}>
            <div>
              <h1 style={h1Style}>Let&apos;s talk food</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--muted)' }}>
                Restrictions first — then a quick-fire taste test.
              </p>
            </div>

            <FieldCol delay={0.05} gap={10}>
              <label style={labelStyle}>Dietary restriction</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DIETS.map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setDietPreset(d.v)}
                    style={pillStyle(dietPreset === d.v)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {dietPreset === 'other' && (
                <input
                  className="ob-input"
                  value={dietOther}
                  onChange={(e) => setDietOther(e.target.value)}
                  placeholder="Describe your restriction"
                  style={{ ...inputStyle, marginTop: 2, padding: '13px 15px' }}
                />
              )}
            </FieldCol>

            {/* Taste test */}
            <div
              style={{
                borderRadius: 20,
                background:
                  'linear-gradient(180deg,var(--surface),rgba(16,18,24,.4))',
                border: '1px solid var(--border)',
                padding: '18px 16px 20px',
                overflow: 'hidden',
                backdropFilter: 'blur(8px)',
                animation: 'riseIn .5s both',
                animationDelay: '.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '.16em',
                    color: 'var(--accent)',
                  }}
                >
                  TASTE TEST
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {FOOD_PREFERENCE_PAIRS.map((p, i) => {
                    const cur = i === quizIndex
                    const filled = i < quizIndex
                    return (
                      <span
                        key={p.id}
                        style={{
                          width: cur ? 18 : 7,
                          height: 7,
                          borderRadius: 999,
                          background:
                            filled || cur ? 'var(--accent)' : 'var(--surface-3)',
                          boxShadow: cur ? '0 0 10px var(--accent)' : 'none',
                          transition: 'all .3s cubic-bezier(.2,.9,.3,1)',
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {quizIndex < total && pair ? (
                <div>
                  <div
                    style={{ position: 'relative', height: 206, marginTop: 2 }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 16,
                        right: 16,
                        top: 18,
                        height: 174,
                        borderRadius: 18,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        opacity: 0.45,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: 9,
                        height: 180,
                        borderRadius: 18,
                        background: 'var(--surface-3)',
                        border: '1px solid var(--border)',
                        opacity: 0.7,
                      }}
                    />
                    <div
                      ref={cardRef}
                      onPointerDown={onCardDown}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        height: 186,
                        borderRadius: 18,
                        background:
                          'linear-gradient(180deg,var(--surface-3),var(--surface))',
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 54px -22px rgba(0,0,0,.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 18,
                        padding: '22px 20px',
                        cursor: 'grab',
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        willChange: 'transform',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '.16em',
                          color: 'var(--accent)',
                        }}
                      >
                        {promptFor(pair.id).toUpperCase()}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          justifyContent: 'center',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => flyChoose('a')}
                          className="ob-quiz-choice"
                          style={quizChoiceStyle}
                        >
                          {pair.a.label}
                        </button>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--muted)',
                            letterSpacing: '.06em',
                          }}
                        >
                          VS
                        </span>
                        <button
                          type="button"
                          onClick={() => flyChoose('b')}
                          className="ob-quiz-choice"
                          style={quizChoiceStyle}
                        >
                          {pair.b.label}
                        </button>
                      </div>
                      <span ref={stampLRef} style={stampStyle(-13)}>
                        {pair.a.label}
                      </span>
                      <span ref={stampRRef} style={stampStyle(13)}>
                        {pair.b.label}
                      </span>
                    </div>
                  </div>
                  <p
                    style={{
                      margin: '14px 0 0',
                      fontSize: 12,
                      color: 'var(--muted)',
                      textAlign: 'center',
                    }}
                  >
                    Drag the card{' '}
                    <span style={{ color: 'var(--fg)', fontWeight: 600 }}>←</span>{' '}
                    or{' '}
                    <span style={{ color: 'var(--fg)', fontWeight: 600 }}>→</span>{' '}
                    — or tap a choice
                  </p>
                  <div style={{ textAlign: 'center', marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setQuizIndex(total)}
                      className="ob-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        fontSize: 12.5,
                        cursor: 'pointer',
                        padding: '6px 10px',
                      }}
                    >
                      Skip the rest →
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '14px 6px',
                    animation: 'popIn .4s cubic-bezier(.2,.9,.3,1) both',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: 'color-mix(in srgb,var(--green) 16%,transparent)',
                      border:
                        '1px solid color-mix(in srgb,var(--green) 45%,transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 9,
                        borderLeft: '3px solid var(--green)',
                        borderBottom: '3px solid var(--green)',
                        transform: 'rotate(-45deg) translate(1px,-2px)',
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: '-.02em',
                    }}
                  >
                    Taste profile locked in
                  </p>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 13,
                      color: 'var(--muted)',
                    }}
                  >
                    We&apos;ll lean your meal-photo estimates toward what you
                    actually eat.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ REVEAL ============ */}
        {isReveal && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 22,
              padding: '8px 0 20px',
              animation: 'riseIn .5s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '.2em',
                  color: 'var(--accent)',
                  marginBottom: 6,
                }}
              >
                YOUR PLAN IS READY
              </div>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>
                Daily target, built from your numbers.
              </p>
            </div>

            <div
              style={{ position: 'relative', textAlign: 'center', padding: '18px 0 8px' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-55%)',
                  width: 240,
                  height: 240,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle,var(--accent-glow),transparent 62%)',
                  filter: 'blur(24px)',
                  animation: 'glowPulse 3.2s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              />
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '.18em',
                    color: 'var(--muted)',
                    marginBottom: 12,
                    transition: 'color .3s',
                  }}
                >
                  {revealPhase === 'sub' || revealPhase === 'done'
                    ? 'YOUR DAILY TARGET'
                    : 'YOUR BASE BURN · TDEE'}
                </div>
                <div
                  style={{
                    fontSize: 84,
                    lineHeight: 1,
                    fontWeight: 700,
                    letterSpacing: '-.05em',
                    animation: countDone ? 'numPulse .9s ease-out both' : 'none',
                  }}
                >
                  {Math.round(disp.cal).toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '.14em',
                    color: 'var(--muted)',
                    marginTop: 8,
                  }}
                >
                  KCAL / DAY
                </div>
                {showDelta && Math.abs(revealDelta) >= 1 && (
                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: 14,
                      padding: '7px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '-.01em',
                      color: revealDeficit ? 'var(--amber)' : 'var(--green)',
                      background: revealDeficit
                        ? 'color-mix(in srgb,var(--amber) 12%,transparent)'
                        : 'color-mix(in srgb,var(--green) 12%,transparent)',
                      border: `1px solid ${
                        revealDeficit
                          ? 'color-mix(in srgb,var(--amber) 40%,transparent)'
                          : 'color-mix(in srgb,var(--green) 40%,transparent)'
                      }`,
                      animation: 'popIn .4s cubic-bezier(.2,.9,.3,1) both',
                    }}
                  >
                    {revealDeficit
                      ? `− ${Math.abs(revealDelta).toLocaleString()} kcal deficit`
                      : `+ ${Math.abs(revealDelta).toLocaleString()} kcal surplus`}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 6,
                height: 12,
                borderRadius: 999,
                overflow: 'hidden',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  background: 'var(--green)',
                  transition: 'width .9s cubic-bezier(.2,.9,.15,1)',
                  width: `${(pCal / totCal) * 100}%`,
                }}
              />
              <div
                style={{
                  background: 'var(--accent)',
                  transition: 'width .9s cubic-bezier(.2,.9,.15,1)',
                  width: `${(cCal / totCal) * 100}%`,
                }}
              />
              <div
                style={{
                  background: 'var(--amber)',
                  transition: 'width .9s cubic-bezier(.2,.9,.15,1)',
                  width: `${(fCal / totCal) * 100}%`,
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 11,
              }}
            >
              <MacroCard
                label="PROTEIN"
                color="var(--green)"
                value={Math.round(disp.pro)}
              />
              <MacroCard
                label="CARBS"
                color="var(--accent)"
                value={Math.round(disp.carb)}
              />
              <MacroCard
                label="FAT"
                color="var(--amber)"
                value={Math.round(disp.fat)}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '8px 20px',
                fontSize: 12.5,
                color: 'var(--muted)',
              }}
            >
              <span>
                BMR{' '}
                <span style={{ color: 'var(--fg)', fontWeight: 600 }}>
                  {ft.bmr.toLocaleString()}
                </span>
              </span>
              <span>
                TDEE{' '}
                <span style={{ color: 'var(--fg)', fontWeight: 600 }}>
                  {ft.tdee.toLocaleString()}
                </span>
              </span>
              <span>
                Goal{' '}
                <span
                  style={{
                    color: 'var(--fg)',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {goalType || 'maintain'}
                </span>
              </span>
            </div>

            {state?.error && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--danger)',
                }}
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="ob-primary"
              style={{
                marginTop: 6,
                width: '100%',
                padding: 17,
                border: 'none',
                borderRadius: 16,
                background:
                  'linear-gradient(135deg,var(--accent),var(--accent-2))',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: pending ? 'not-allowed' : 'pointer',
                opacity: pending ? 0.75 : 1,
                boxShadow:
                  '0 12px 40px -10px var(--accent-glow),inset 0 1px 0 rgba(255,255,255,.2)',
              }}
            >
              {pending ? 'Saving…' : 'Start tracking  →'}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="ob-link"
              style={{
                width: '100%',
                padding: 6,
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ← Adjust my details
            </button>
          </div>
        )}

        {/* ============ FOOTER NAV ============ */}
        {screen !== 'hero' && !isReveal && (
          <div
            style={{
              marginTop: 28,
              display: 'flex',
              gap: 12,
              alignItems: 'stretch',
            }}
          >
            <button
              type="button"
              onClick={goBack}
              className="ob-nav-back"
              style={{
                flexShrink: 0,
                width: 54,
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                fontSize: 19,
                cursor: 'pointer',
              }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="ob-press-sm"
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 14,
                border: 'none',
                fontSize: 15.5,
                fontWeight: 700,
                letterSpacing: '-.01em',
                color: canAdvance ? '#fff' : 'var(--muted)',
                cursor: canAdvance ? 'pointer' : 'not-allowed',
                transition: 'transform .16s,box-shadow .2s,opacity .2s',
                background: canAdvance
                  ? 'linear-gradient(135deg,var(--accent),var(--accent-2))'
                  : 'var(--surface-3)',
                boxShadow: canAdvance
                  ? '0 12px 40px -12px var(--accent-glow),inset 0 1px 0 rgba(255,255,255,.2)'
                  : 'none',
                opacity: canAdvance ? 1 : 0.7,
              }}
            >
              {screen === 'food' ? 'See my plan  →' : 'Continue  →'}
            </button>
          </div>
        )}
      </div>
    </form>
  )
}

/* ---------------------------------------------------------------------------
   Small presentational helpers.
--------------------------------------------------------------------------- */
const quizChoiceStyle: CSSProperties = {
  flex: 1,
  maxWidth: 148,
  padding: '16px 10px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  fontSize: 15.5,
  fontWeight: 700,
  lineHeight: 1.15,
  cursor: 'pointer',
}

function stampStyle(rotate: number): CSSProperties {
  return {
    position: 'absolute',
    top: 16,
    ...(rotate < 0 ? { left: 16 } : { right: 16 }),
    padding: '5px 10px',
    borderRadius: 8,
    border: '2px solid var(--accent)',
    color: 'var(--accent)',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.06em',
    transform: `rotate(${rotate}deg)`,
    opacity: 0,
    pointerEvents: 'none',
    textTransform: 'uppercase',
    maxWidth: 120,
    textAlign: 'center',
    lineHeight: 1.1,
  }
}

function FieldCol({
  children,
  delay,
  gap = 8,
}: {
  children: React.ReactNode
  delay: number
  gap?: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        animation: 'riseIn .5s both',
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

function HeroStat({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '15px 16px',
        borderRadius: 16,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

function MacroCard({
  label,
  color,
  value,
}: {
  label: string
  color: string
  value: number
}) {
  return (
    <div
      style={{
        padding: '16px 12px',
        borderRadius: 16,
        background: 'var(--surface)',
        border: `1px solid color-mix(in srgb,${color} 30%,var(--border))`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.08em',
          color,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-.02em',
          marginTop: 4,
        }}
      >
        {value}
        <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>
          g
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Live weight-trajectory chart (goal step).
--------------------------------------------------------------------------- */
type Trend =
  | { ready: false; hint: boolean }
  | {
      ready: true
      path: string
      area: string
      color: string
      startPct: string
      startTop: string
      goalPct: string
      goalTop: string
      startLabel: string
      goalLabel: string
      tooFast: boolean
    }

function buildTrend({
  goalType,
  currentWeightKg,
  targetWeightKg,
  rateKgPerWeek,
  weightUnit,
}: {
  goalType: GoalType | ''
  currentWeightKg: number
  targetWeightKg: number
  rateKgPerWeek: number
  weightUnit: WeightUnit
}): Trend {
  const W = 306
  const padL = 10
  const padR = 10
  const padT = 16
  const padB = 20
  const plotW = W - padL - padR
  const plotH = 96 - padT - padB
  if (goalType === 'maintain') return { ready: false, hint: false }
  const cw = currentWeightKg
  const tw = targetWeightKg
  if (
    !goalType ||
    Number.isNaN(cw) ||
    Number.isNaN(tw) ||
    cw <= 0 ||
    tw <= 0 ||
    cw === tw
  )
    return { ready: false, hint: true }
  const rate = rateKgPerWeek
  if (Number.isNaN(rate) || rate <= 0) return { ready: false, hint: true }
  const weeks = Math.abs(cw - tw) / rate
  const winWeeks = Math.min(Math.max(weeks, 20), 104)
  const minW = Math.min(cw, tw)
  const maxW = Math.max(cw, tw)
  const span = Math.max(0.5, maxW - minW)
  const yFor = (w: number) => padT + ((maxW - w) / span) * plotH
  const xFor = (wk: number) => padL + (Math.min(wk, winWeeks) / winWeeks) * plotW
  const x0 = padL
  const y0 = yFor(cw)
  const xEnd = padL + plotW
  const yBot = padT + plotH
  let path: string
  let area: string
  let gx: number
  let gy: number
  if (weeks <= winWeeks) {
    const xg = xFor(weeks)
    const yg = yFor(tw)
    path = `M ${x0} ${y0.toFixed(1)} L ${xg.toFixed(1)} ${yg.toFixed(1)} L ${xEnd} ${yg.toFixed(1)}`
    area = `${path} L ${xEnd} ${yBot} L ${x0} ${yBot} Z`
    gx = xg
    gy = yg
  } else {
    const wEnd = cw + (tw - cw) * (winWeeks / weeks)
    const yEnd = yFor(wEnd)
    path = `M ${x0} ${y0.toFixed(1)} L ${xEnd} ${yEnd.toFixed(1)}`
    area = `${path} L ${xEnd} ${yBot} L ${x0} ${yBot} Z`
    gx = xEnd
    gy = yEnd
  }
  const tooFast = Math.abs(rate) > maxWeeklyRateKg(cw) + 1e-9
  const show = (kg: number) => (weightUnit === 'kg' ? kg : kgToLb(kg))
  const wkLabel =
    weeks < 8
      ? `${Math.max(1, Math.round(weeks))} wk`
      : `${Math.round(weeks / 4.345)} mo`
  return {
    ready: true,
    path,
    area,
    color: tooFast ? 'var(--amber)' : 'var(--accent)',
    startPct: `${((x0 / W) * 100).toFixed(1)}%`,
    startTop: `${y0.toFixed(1)}px`,
    goalPct: `${((gx / W) * 100).toFixed(1)}%`,
    goalTop: `${gy.toFixed(1)}px`,
    startLabel: `Today · ${Math.round(show(cw))}${weightUnit}`,
    goalLabel: `${Math.round(show(tw))}${weightUnit} · ${wkLabel}`,
    tooFast,
  }
}

function TrendChart({ trend }: { trend: Trend }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        animation: 'riseIn .4s both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <label style={labelStyle}>Projected trajectory</label>
        {trend.ready && trend.tooFast && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.08em',
              color: 'var(--amber)',
            }}
          >
            TOO AGGRESSIVE
          </span>
        )}
      </div>
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          padding: '8px 10px 6px',
        }}
      >
        {trend.ready ? (
          <>
            <div style={{ position: 'relative', height: 96 }}>
              <svg
                viewBox="0 0 306 96"
                width="100%"
                height="96"
                preserveAspectRatio="none"
                style={{ display: 'block' }}
              >
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trend.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={trend.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={trend.area} fill="url(#trendFill)" />
                <path
                  d={trend.path}
                  fill="none"
                  stroke={trend.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ transition: 'stroke .3s' }}
                />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: 'var(--fg)',
                  left: trend.startPct,
                  top: trend.startTop,
                  transform: 'translate(-50%,-50%)',
                  boxShadow: '0 0 0 3px var(--surface-2)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: trend.color,
                  left: trend.goalPct,
                  top: trend.goalTop,
                  transform: 'translate(-50%,-50%)',
                  boxShadow: `0 0 12px ${trend.color}`,
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10.5,
                color: 'var(--muted)',
                padding: '6px 2px 0',
              }}
            >
              <span>{trend.startLabel}</span>
              <span style={{ color: trend.color, fontWeight: 600 }}>
                {trend.goalLabel}
              </span>
            </div>
          </>
        ) : (
          <div
            style={{
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12.5,
              color: 'var(--muted)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Set a pace or target date to
            <br />
            preview your path to goal
          </div>
        )}
      </div>
    </div>
  )
}
