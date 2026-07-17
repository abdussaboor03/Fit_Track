-- Water tracking. One running total per day lives on daily_logs (avoids a new
-- table for a single value); the per-user daily target lives on profiles.
-- Run against an existing project; fresh projects get the final shape from
-- schema.sql directly.

alter table daily_logs add column if not exists water_ml int default 0;
alter table profiles add column if not exists water_target_ml int default 2500;
