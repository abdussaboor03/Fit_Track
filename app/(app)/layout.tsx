import Link from 'next/link'
import { requireProfile } from '@/lib/auth/dal'

// Every route in this group requires a completed profile. requireProfile
// redirects to /onboarding when setup is incomplete.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Guard: redirects to /onboarding if the profile is incomplete.
  await requireProfile()

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-bold tracking-tight">FitTrack</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/dashboard">Home</NavLink>
            <NavLink href="/log/meal">Meal</NavLink>
            <NavLink href="/log/daily">Check-in</NavLink>
            <NavLink href="/history">History</NavLink>
            <NavLink href="/settings">Settings</NavLink>
            <a
              href="/sign-out"
              className="ml-1 rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-foreground"
            >
              Sign out
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </Link>
  )
}
