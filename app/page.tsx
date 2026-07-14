import { redirect } from 'next/navigation'

// The proxy handles the unauthenticated case (redirect to /login); an
// authenticated visitor lands on their dashboard.
export default function Home() {
  redirect('/dashboard')
}
