import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              FitTrack
            </span>
          </div>
          <p className="text-sm text-muted">
            Track calories, macros, and training — personalized to you.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-7 shadow-xl shadow-black/30">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
