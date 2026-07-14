import Link from 'next/link'
import { MealForm } from './meal-form'

export default function LogMealPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
        Log a meal
      </h1>
      <p className="mb-6 text-sm text-muted">
        Snap a photo for an instant estimate, or enter the details manually.
      </p>

      <MealForm />

      <p className="mt-6 text-center text-sm">
        <Link href="/dashboard" className="text-muted hover:text-foreground">
          Back to dashboard
        </Link>
      </p>
    </div>
  )
}
