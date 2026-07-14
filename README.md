# FitTrack

Personalized calorie, macro, and training tracker. Next.js 16 (App Router) +
Supabase (Auth + Postgres + RLS) + Tailwind 4. Built multi-tenant from day one
(every table scoped by `user_id` with RLS) so it can become a product later.

## Setup

1. **Install** (already done if you ran `npm install`):
   ```bash
   npm install
   ```

2. **Supabase project** — create one at https://supabase.com, then run the
   schema in the SQL editor:
   ```
   supabase/schema.sql
   ```
   This creates `profiles`, `daily_logs`, `workouts`, `meals` and their RLS
   policies. If email confirmation is off (Auth → Providers → Email), sign-up
   flows straight into onboarding.

3. **Environment** — copy the example and fill in your keys:
   ```bash
   cp .env.local.example .env.local
   ```
   | Var | Where |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (server-only) |
   | `ANTHROPIC_API_KEY` | For the Claude meal-photo endpoint (later stage) |

4. **Run:**
   ```bash
   npm run dev
   ```

## What's built

- Email/password auth (`/login`) with a `proxy.ts` gate (Next 16 renamed
  `middleware` → `proxy`).
- Onboarding (`/onboarding`) with unit toggles, rate-cap warnings, and a live
  calorie/macro target preview (Mifflin-St Jeor → TDEE → goal-adjusted target).
- Daily check-in (`/log/daily`) — weight, gym + repeatable exercises, steps.
- Meal logging (`/log/meal`) — snap a photo for an instant Claude estimate
  (`POST /api/analyze-meal`, `claude-sonnet-4-6`, biased by your dietary
  restriction + food preferences; the photo is analyzed then discarded, never
  stored), or enter macros manually.
- Onboarding includes a paired-choice food-preference quiz (`food_preferences`
  jsonb); `/settings` lets you edit those preferences anytime.
- Dashboard (`/dashboard`) — today's calories/macros vs. targets, 90-day weight
  trend chart, weekly training count, quick actions.

## Not yet built

- History / calendar view (`/history`).

The nutrition math lives in `lib/fitness/calc.ts` (pure, unit-tested-friendly).
