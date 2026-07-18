import { bmiFrom } from '@/lib/fitness/calc'

// Compact BMI readout. Pure display from height + weight — no new data. BMI is
// deliberately de-emphasized: just the number and a caveat that it ignores
// muscle mass — no category label (Normal/Obese/…) at all, so it reads as rough
// context rather than a health verdict. Renders a hint instead of a number when
// inputs aren't usable yet. Pass `compact` for the smaller dashboard tile.
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

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs text-muted">BMI</p>
        <p className="mt-0.5 text-lg font-semibold text-foreground">{bmi}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          A rough screen — doesn&apos;t account for muscle mass.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-xs text-muted">BMI</p>
      <p className="mt-0.5 text-2xl font-bold text-foreground">{bmi}</p>
      <p className="mt-1 text-xs leading-snug text-muted">
        A rough screen only — BMI doesn&apos;t account for muscle mass, so it
        isn&apos;t a precise health verdict.
      </p>
    </div>
  )
}
