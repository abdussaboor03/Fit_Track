import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/dal'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  // Auth is enforced by the proxy; if setup is already done, skip onboarding.
  const profile = await getProfile()
  if (profile && profile.daily_calorie_target !== null) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-lg font-bold tracking-tight">FitTrack</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Let&apos;s build your plan
        </h1>
        <p className="mt-1 text-sm text-muted">
          A few details and we&apos;ll calculate your daily calorie and macro
          targets.
        </p>
      </header>

      <OnboardingForm />
    </div>
  )
}
