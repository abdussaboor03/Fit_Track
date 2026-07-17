import {
  BMI_CATEGORY_LABELS,
  bmiCategory,
  bmiFrom,
  type BmiCategory,
} from '@/lib/fitness/calc'

const CATEGORY_COLOR: Record<BmiCategory, string> = {
  underweight: 'text-warning',
  normal: 'text-success',
  overweight: 'text-warning',
  obese: 'text-danger',
}

// Compact BMI readout. Pure display from height + weight — no new data. Renders
// a hint instead of a number when inputs aren't usable yet (e.g. live in the
// settings form before both fields are filled). Pass `compact` for the smaller
// dashboard tile.
export function BmiStat({
  heightCm,
  weightKg,
  compact = false,
}: {
  heightCm: number
  weightKg: number
  compact?: boolean
}) {
  const bmi = bmiFrom(heightCm, weightKg)

  if (bmi == null) {
    if (compact) return null
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <p className="text-xs text-muted">BMI</p>
        <p className="mt-1 text-sm text-muted">
          Enter height and weight to see your BMI.
        </p>
      </div>
    )
  }

  const category = bmiCategory(bmi)
  const label = BMI_CATEGORY_LABELS[category]

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs text-muted">BMI</p>
        <p className="mt-0.5 text-lg font-semibold text-foreground">
          {bmi}
          <span className={`ml-2 text-xs font-medium ${CATEGORY_COLOR[category]}`}>
            {label}
          </span>
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          Doesn&apos;t account for muscle mass.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted">BMI</p>
        <p className={`text-xs font-semibold ${CATEGORY_COLOR[category]}`}>
          {label}
        </p>
      </div>
      <p className="mt-0.5 text-2xl font-bold text-foreground">{bmi}</p>
      <p className="mt-1 text-xs leading-snug text-muted">
        A rough screen only — BMI doesn&apos;t account for muscle mass, so it
        isn&apos;t a precise health verdict.
      </p>
    </div>
  )
}
