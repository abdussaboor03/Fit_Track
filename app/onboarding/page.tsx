import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/dal'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  // Auth is enforced by the proxy; if setup is already done, skip onboarding.
  const profile = await getProfile()
  if (profile && profile.daily_calorie_target !== null) {
    redirect('/dashboard')
  }

  // The wizard renders its own full-bleed hero, progress header, and layout.
  return <OnboardingForm />
}
