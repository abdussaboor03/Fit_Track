-- FitTrack schema. Run in the Supabase SQL editor (or via the CLI) against a
-- fresh project. Multi-tenant from day one: every table is scoped by the
-- authenticated user and protected by row-level security.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, holds onboarding data + calculated targets
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  sex text check (sex in ('male','female')),
  date_of_birth date,
  height_cm numeric,
  goal_type text check (goal_type in ('lose','maintain','gain')),
  target_weight_kg numeric,
  target_rate_kg_per_week numeric,
  activity_level text check (activity_level in ('sedentary','lightly_active','active','very_active')),
  workout_frequency text check (workout_frequency in ('none','1-2','3-4','5+')),
  dietary_restriction text,
  food_preferences jsonb,
  water_target_ml int default 2500,
  daily_calorie_target int,
  daily_protein_g int,
  daily_carb_g int,
  daily_fat_g int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- daily_logs: one row per user per day
-- ---------------------------------------------------------------------------
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric,
  went_gym boolean default false,
  steps int,
  water_ml int default 0,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

-- ---------------------------------------------------------------------------
-- workouts: multiple rows per daily_log (if went_gym = true)
-- ---------------------------------------------------------------------------
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null,
  exercise_name text not null,
  sets int,
  reps int,
  weight_kg numeric,
  notes text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- meals: photo is analyzed then discarded, only the name + macros persist
-- ---------------------------------------------------------------------------
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null,
  meal_name text not null,
  meal_time time,
  description text,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  source text check (source in ('photo','manual')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- body_measurements: optional, opt-in circumference tracking (one row per day)
-- ---------------------------------------------------------------------------
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null,
  waist_cm numeric,
  chest_cm numeric,
  arms_cm numeric,
  thighs_cm numeric,
  hips_cm numeric,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

-- Helpful lookup indexes for per-day queries.
create index if not exists daily_logs_user_date_idx on daily_logs (user_id, log_date);
create index if not exists workouts_user_date_idx on workouts (user_id, log_date);
create index if not exists meals_user_date_idx on meals (user_id, log_date);
create index if not exists body_measurements_user_date_idx on body_measurements (user_id, log_date);

-- Keep profiles.updated_at fresh.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: users can only touch their own rows.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table daily_logs enable row level security;
alter table workouts enable row level security;
alter table meals enable row level security;
alter table body_measurements enable row level security;

drop policy if exists "own rows only" on profiles;
drop policy if exists "own rows only" on daily_logs;
drop policy if exists "own rows only" on workouts;
drop policy if exists "own rows only" on meals;
drop policy if exists "own rows only" on body_measurements;

create policy "own rows only" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "own rows only" on daily_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on workouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on body_measurements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
