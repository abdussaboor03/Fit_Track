-- Body measurements. Optional, opt-in tracking of circumferences over time.
-- One row per user per day (upsert to correct a same-day entry). All part
-- columns are nullable — users won't log every part every time. Run against an
-- existing project; fresh projects get the final shape from schema.sql.

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

create index if not exists body_measurements_user_date_idx
  on body_measurements (user_id, log_date);

alter table body_measurements enable row level security;

drop policy if exists "own rows only" on body_measurements;
create policy "own rows only" on body_measurements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
