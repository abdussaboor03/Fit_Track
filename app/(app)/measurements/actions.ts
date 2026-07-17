'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyUser } from '@/lib/auth/dal'
import { todayISO } from '@/lib/fitness/date'
import { BODY_PARTS, BODY_PART_COLUMN } from '@/lib/fitness/types'

export type MeasurementState = { ok?: boolean; error?: string } | undefined

function optionalCm(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? '').trim()
  if (raw === '') return null
  const v = Number(raw)
  if (!Number.isFinite(v) || v <= 0 || v > 500) return null
  return Number(v.toFixed(1))
}

export async function saveMeasurement(
  _prev: MeasurementState,
  formData: FormData,
): Promise<MeasurementState> {
  const { userId } = await verifyUser()
  const supabase = await createSupabaseServerClient()

  const logDate = String(formData.get('log_date') || todayISO())
  const notes = String(formData.get('notes') ?? '').trim()

  const parts: Record<string, number | null> = {}
  for (const part of BODY_PARTS) {
    parts[BODY_PART_COLUMN[part] as string] = optionalCm(formData, part)
  }

  // Require at least one measurement so we don't store empty rows.
  if (BODY_PARTS.every((p) => parts[BODY_PART_COLUMN[p] as string] === null)) {
    return { error: 'Enter at least one measurement.' }
  }

  const { error } = await supabase.from('body_measurements').upsert(
    {
      user_id: userId,
      log_date: logDate,
      ...parts,
      notes: notes || null,
    },
    { onConflict: 'user_id,log_date' },
  )

  if (error) {
    console.error('[saveMeasurement] error:', error.message)
    return { error: 'Could not save your measurements. Please try again.' }
  }

  revalidatePath('/measurements')
  return { ok: true }
}
