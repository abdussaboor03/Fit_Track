-- Replace the free-text excluded_foods list with a structured food_preferences
-- object (paired-choice quiz). Run this against an existing project; fresh
-- projects get the final shape from schema.sql directly.

alter table profiles add column if not exists food_preferences jsonb;
alter table profiles drop column if exists excluded_foods;
