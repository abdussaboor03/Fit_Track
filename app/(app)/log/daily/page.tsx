import { verifyUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/fitness/date'
import { DailyForm } from './daily-form'

export default async function DailyCheckInPage() {
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()
  const today = todayISO()

  const { data: log } = await supabase
    .from('daily_logs')
    .select('weight_kg')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle()

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
        Daily check-in
      </h1>
      <p className="mb-6 text-sm text-muted">
        Log today&apos;s weight, training, and steps.
      </p>
      <DailyForm
        logDate={today}
        initialWeightKg={(log?.weight_kg as number | null) ?? null}
      />
    </div>
  )
}
