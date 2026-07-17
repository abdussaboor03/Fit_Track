import { verifyUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatShortDate, todayISO } from '@/lib/fitness/date'
import {
  BODY_PARTS,
  BODY_PART_COLUMN,
  type BodyMeasurement,
} from '@/lib/fitness/types'
import { MeasurementForm } from './measurement-form'
import { MeasurementCharts, type MeasurementPoint } from './measurement-charts'

export default async function MeasurementsPage() {
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: true })

  const rows = (data as BodyMeasurement[] | null) ?? []

  const chartData: MeasurementPoint[] = rows.map((r) => {
    const point: MeasurementPoint = {
      date: r.log_date,
      label: formatShortDate(r.log_date),
    }
    for (const part of BODY_PARTS) {
      const v = r[BODY_PART_COLUMN[part]] as number | null
      if (v != null) point[part] = Number(v)
    }
    return point
  })

  // Prefill the form with the most recent value logged for each part.
  const latest: Partial<Record<(typeof BODY_PARTS)[number], string>> = {}
  for (const part of BODY_PARTS) {
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i][BODY_PART_COLUMN[part]] as number | null
      if (v != null) {
        latest[part] = String(Number(v))
        break
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
          Body measurements
        </h1>
        <p className="text-sm text-muted">
          Optional — track circumferences over time. Log what you want, when you
          want.
        </p>
      </div>

      <MeasurementForm logDate={todayISO()} initial={latest} />

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          Trends
        </h2>
        <MeasurementCharts data={chartData} />
      </div>
    </div>
  )
}
