-- FORMA. Ejecuta este archivo en el editor SQL de Supabase, antes de 002_exercises.sql y 003_storage.sql.
-- No incluye la clave service_role. La app solo usa la clave anónima y estas políticas.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  height_cm numeric(5,1),
  timezone text not null default 'America/Santiago',
  onboarding_completed boolean not null default false,
  active_plan_id uuid,
  preferred_rest_seconds integer not null default 90,
  rest_timer_enabled boolean not null default true,
  sound_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_height_chk check (height_cm is null or (height_cm >= 100 and height_cm <= 250)),
  constraint profiles_rest_chk check (preferred_rest_seconds between 15 and 600)
);

create table if not exists public.exercises (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete cascade,
  client_id uuid not null,
  slug text,
  name text not null,
  muscle_group text not null,
  secondary_muscles text[] not null default '{}',
  equipment text not null default '',
  machine_name text,
  instructions text not null default '',
  common_mistakes text not null default '',
  alternative_slugs text[] not null default '{}',
  tracking_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_chk check (char_length(name) between 2 and 80),
  constraint exercises_group_chk check (muscle_group in ('pecho','espalda','hombros','biceps','triceps','piernas','abdomen','cardio')),
  constraint exercises_tracking_chk check (tracking_type in ('weight_reps','reps','time','distance'))
);

create unique index if not exists exercises_global_slug_idx on public.exercises (slug) where user_id is null and slug is not null;
create unique index if not exists exercises_user_client_idx on public.exercises (user_id, client_id);

create table if not exists public.workout_plans (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_plans_name_chk check (char_length(name) between 1 and 80),
  unique (user_id, client_id)
);

create unique index if not exists workout_plans_one_active_idx on public.workout_plans (user_id) where is_active;

create table if not exists public.workout_plan_days (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  client_id uuid not null,
  weekday smallint not null,
  label text not null,
  day_kind text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_plan_days_weekday_chk check (weekday between 1 and 7),
  constraint workout_plan_days_kind_chk check (day_kind in ('strength','rest','cardio','free')),
  unique (user_id, client_id),
  unique (plan_id, weekday)
);

create table if not exists public.workout_plan_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_day_id uuid not null references public.workout_plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  client_id uuid not null,
  sort_order integer not null default 0,
  target_sets integer not null default 3,
  target_reps_min integer,
  target_reps_max integer,
  target_seconds integer,
  rest_seconds integer not null default 90,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_ex_sets_chk check (target_sets between 1 and 20),
  constraint plan_ex_reps_chk check (
    (target_reps_min is null or target_reps_min between 1 and 200)
    and (target_reps_max is null or target_reps_max between 1 and 200)
    and (target_reps_max is null or target_reps_min is null or target_reps_max >= target_reps_min)
  ),
  constraint plan_ex_seconds_chk check (target_seconds is null or target_seconds between 1 and 7200),
  constraint plan_ex_rest_chk check (rest_seconds between 0 and 600),
  unique (user_id, client_id)
);

create table if not exists public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  plan_id uuid references public.workout_plans (id) on delete set null,
  plan_day_id uuid references public.workout_plan_days (id) on delete set null,
  title text not null default '',
  status text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  paused_ms integer not null default 0,
  pause_started_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_status_chk check (status in ('active','paused','completed','abandoned')),
  constraint workout_sessions_pause_chk check (paused_ms >= 0),
  constraint workout_sessions_time_chk check (ended_at is null or ended_at >= started_at),
  unique (user_id, client_id)
);

create unique index if not exists workout_sessions_one_open_idx
  on public.workout_sessions (user_id)
  where status in ('active', 'paused');

create table if not exists public.workout_session_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  client_id uuid not null,
  sort_order integer not null default 0,
  notes text not null default '',
  substituted_from_exercise_id uuid references public.exercises (id),
  replaced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create table if not exists public.workout_sets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_exercise_id uuid not null references public.workout_session_exercises (id) on delete cascade,
  client_id uuid not null,
  set_index integer not null,
  weight_kg numeric(6,2),
  reps integer,
  duration_seconds integer,
  distance_m numeric(8,1),
  rpe numeric(3,1),
  is_warmup boolean not null default false,
  completed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sets_index_chk check (set_index between 1 and 50),
  constraint workout_sets_weight_chk check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 500)),
  constraint workout_sets_reps_chk check (reps is null or (reps >= 0 and reps <= 200)),
  constraint workout_sets_duration_chk check (duration_seconds is null or (duration_seconds >= 0 and duration_seconds <= 86400)),
  constraint workout_sets_distance_chk check (distance_m is null or (distance_m >= 0 and distance_m <= 200000)),
  constraint workout_sets_rpe_chk check (rpe is null or (rpe >= 1 and rpe <= 10)),
  unique (user_id, client_id),
  unique (session_exercise_id, set_index)
);

create table if not exists public.cardio_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  exercise_id uuid references public.exercises (id),
  activity_name text not null default 'Cardio',
  started_at timestamptz not null default now(),
  duration_seconds integer not null,
  distance_m numeric(8,1),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cardio_duration_chk check (duration_seconds >= 0 and duration_seconds <= 86400),
  constraint cardio_distance_chk check (distance_m is null or (distance_m >= 0 and distance_m <= 200000)),
  unique (user_id, client_id)
);

create table if not exists public.body_weight_logs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  logged_at timestamptz not null default now(),
  weight_kg numeric(5,2) not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_weight_chk check (weight_kg >= 30 and weight_kg <= 300),
  unique (user_id, client_id)
);

create table if not exists public.body_measurements (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  measured_at timestamptz not null default now(),
  waist_cm numeric(5,1),
  abdomen_cm numeric(5,1),
  chest_cm numeric(5,1),
  hip_cm numeric(5,1),
  arm_cm numeric(5,1),
  thigh_cm numeric(5,1),
  neck_cm numeric(5,1),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint measure_waist_chk check (waist_cm is null or waist_cm between 40 and 200),
  constraint measure_abdomen_chk check (abdomen_cm is null or abdomen_cm between 40 and 200),
  constraint measure_chest_chk check (chest_cm is null or chest_cm between 50 and 200),
  constraint measure_hip_chk check (hip_cm is null or hip_cm between 50 and 200),
  constraint measure_arm_chk check (arm_cm is null or arm_cm between 15 and 80),
  constraint measure_thigh_chk check (thigh_cm is null or thigh_cm between 30 and 120),
  constraint measure_neck_chk check (neck_cm is null or neck_cm between 20 and 60),
  constraint measure_one_chk check (
    waist_cm is not null or abdomen_cm is not null or chest_cm is not null
    or hip_cm is not null or arm_cm is not null or thigh_cm is not null or neck_cm is not null
  ),
  unique (user_id, client_id)
);

create table if not exists public.progress_photos (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  taken_at timestamptz not null default now(),
  angle text not null,
  storage_path text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint progress_photos_angle_chk check (angle in ('front','side','back')),
  constraint progress_photos_path_chk check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  unique (user_id, client_id)
);

create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  goal_type text not null,
  target_value numeric(8,2) not null,
  exercise_id uuid references public.exercises (id) on delete cascade,
  measurement_key text,
  label text not null default '',
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_type_chk check (goal_type in ('body_weight','weekly_workouts','activity_days','strength','measurement')),
  constraint goals_measure_chk check (measurement_key is null or measurement_key in ('waist','abdomen','chest','hip','arm','thigh','neck')),
  unique (user_id, client_id)
);

create table if not exists public.schedule_overrides (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  plan_day_id uuid not null references public.workout_plan_days (id) on delete cascade,
  from_date date not null,
  to_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id),
  unique (user_id, plan_day_id, from_date)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_active_plan_fk'
  ) then
    alter table public.profiles
      add constraint profiles_active_plan_fk
      foreign key (active_plan_id) references public.workout_plans (id) on delete set null;
  end if;
end $$;

create index if not exists workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index if not exists workout_sets_session_exercise_idx on public.workout_sets (session_exercise_id, set_index);
create index if not exists session_exercises_session_idx on public.workout_session_exercises (session_id, sort_order);
create index if not exists plan_exercises_day_idx on public.workout_plan_exercises (plan_day_id, sort_order);
create index if not exists body_weight_user_logged_idx on public.body_weight_logs (user_id, logged_at desc);
create index if not exists body_measurements_user_idx on public.body_measurements (user_id, measured_at desc);
create index if not exists cardio_user_started_idx on public.cardio_sessions (user_id, started_at desc);
create index if not exists progress_photos_user_idx on public.progress_photos (user_id, taken_at desc);
create index if not exists goals_user_idx on public.goals (user_id, created_at desc);

create or replace function public.assert_exercise(p_exercise uuid, p_user uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_exercise is null then
    return;
  end if;
  if not exists (
    select 1 from public.exercises
    where id = p_exercise and (user_id is null or user_id = p_user)
  ) then
    raise exception 'forbidden';
  end if;
end;
$$;

create or replace function public.enforce_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from auth.uid() then
    raise exception 'forbidden';
  end if;
  if new.active_plan_id is not null and not exists (
    select 1 from public.workout_plans where id = new.active_plan_id and user_id = new.id
  ) then
    raise exception 'forbidden';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ownership()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  owner uuid;
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_table_name = 'exercises' then
    if new.user_id is null or new.user_id is distinct from auth.uid() then
      raise exception 'forbidden';
    end if;
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'forbidden';
  end if;
  if tg_table_name = 'workout_plan_days' then
    select user_id into owner from public.workout_plans where id = new.plan_id;
    if owner is distinct from new.user_id then raise exception 'forbidden'; end if;
  elsif tg_table_name = 'workout_plan_exercises' then
    select user_id into owner from public.workout_plan_days where id = new.plan_day_id;
    if owner is distinct from new.user_id then raise exception 'forbidden'; end if;
    perform public.assert_exercise(new.exercise_id, new.user_id);
  elsif tg_table_name = 'workout_sessions' then
    if new.plan_id is not null then
      select user_id into owner from public.workout_plans where id = new.plan_id;
      if owner is distinct from new.user_id then raise exception 'forbidden'; end if;
    end if;
    if new.plan_day_id is not null then
      select user_id into owner from public.workout_plan_days where id = new.plan_day_id;
      if owner is distinct from new.user_id then raise exception 'forbidden'; end if;
    end if;
  elsif tg_table_name = 'workout_session_exercises' then
    select user_id into owner from public.workout_sessions where id = new.session_id;
    if owner is distinct from new.user_id then raise exception 'forbidden'; end if;
    perform public.assert_exercise(new.exercise_id, new.user_id);
    if new.substituted_from_exercise_id is not null then
      perform public.assert_exercise(new.substituted_from_exercise_id, new.user_id);
    end if;
  elsif tg_table_name = 'workout_sets' then
    select user_id into owner from public.workout_session_exercises where id = new.session_exercise_id;
    if owner is distinct from new.user_id then raise exception 'forbidden'; end if;
  elsif tg_table_name = 'goals' then
    perform public.assert_exercise(new.exercise_id, new.user_id);
  elsif tg_table_name = 'cardio_sessions' then
    perform public.assert_exercise(new.exercise_id, new.user_id);
  elsif tg_table_name = 'schedule_overrides' then
    select user_id into owner from public.workout_plan_days where id = new.plan_day_id;
    if owner is distinct from new.user_id then raise exception 'forbidden'; end if;
  elsif tg_table_name = 'progress_photos' then
    if split_part(new.storage_path, '/', 1) is distinct from new.user_id::text then
      raise exception 'forbidden';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Atleta')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.activate_plan(p_plan_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;
  if not exists (
    select 1 from public.workout_plans where id = p_plan_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;
  update public.workout_plans set is_active = false where user_id = auth.uid() and is_active and id <> p_plan_id;
  update public.workout_plans set is_active = true where id = p_plan_id and user_id = auth.uid();
  update public.profiles set active_plan_id = p_plan_id where id = auth.uid();
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists profiles_ownership on public.profiles;
create trigger profiles_ownership before update on public.profiles for each row execute function public.enforce_profile();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'exercises','workout_plans','workout_plan_days','workout_plan_exercises','workout_sessions',
    'workout_session_exercises','workout_sets','cardio_sessions','body_weight_logs','body_measurements',
    'progress_photos','goals','schedule_overrides'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', tbl, tbl);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
    execute format('drop trigger if exists %I_ownership on public.%I', tbl, tbl);
    execute format('create trigger %I_ownership before insert or update on public.%I for each row execute function public.enforce_ownership()', tbl, tbl);
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace view public.completed_set_entries
with (security_invoker = true) as
select
  ws.id,
  ws.user_id,
  ws.weight_kg,
  ws.reps,
  ws.duration_seconds,
  ws.distance_m,
  ws.rpe,
  ws.is_warmup,
  ws.completed_at,
  ws.session_exercise_id,
  wse.exercise_id,
  wse.session_id,
  s.started_at,
  s.plan_day_id,
  s.status as session_status,
  e.name as exercise_name,
  e.muscle_group,
  e.tracking_type
from public.workout_sets ws
join public.workout_session_exercises wse on wse.id = ws.session_exercise_id
join public.workout_sessions s on s.id = wse.session_id
join public.exercises e on e.id = wse.exercise_id
where ws.completed_at is not null
  and s.status = 'completed';

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_days enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.cardio_sessions enable row level security;
alter table public.body_weight_logs enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.goals enable row level security;
alter table public.schedule_overrides enable row level security;

alter table public.profiles force row level security;
alter table public.exercises force row level security;
alter table public.workout_plans force row level security;
alter table public.workout_plan_days force row level security;
alter table public.workout_plan_exercises force row level security;
alter table public.workout_sessions force row level security;
alter table public.workout_session_exercises force row level security;
alter table public.workout_sets force row level security;
alter table public.cardio_sessions force row level security;
alter table public.body_measurements force row level security;
alter table public.body_weight_logs force row level security;
alter table public.progress_photos force row level security;
alter table public.goals force row level security;
alter table public.schedule_overrides force row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select to authenticated using (user_id is null or user_id = auth.uid());
drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises for insert to authenticated with check (user_id = auth.uid());
drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises for delete to authenticated using (user_id = auth.uid());

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'workout_plans','workout_plan_days','workout_plan_exercises','workout_sessions',
    'workout_session_exercises','workout_sets','cardio_sessions','body_weight_logs','body_measurements',
    'progress_photos','goals','schedule_overrides'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I', tbl, tbl);
    execute format('create policy %I_select on public.%I for select to authenticated using (user_id = auth.uid())', tbl, tbl);
    execute format('drop policy if exists %I_insert on public.%I', tbl, tbl);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (user_id = auth.uid())', tbl, tbl);
    execute format('drop policy if exists %I_update on public.%I', tbl, tbl);
    execute format('create policy %I_update on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', tbl, tbl);
    execute format('drop policy if exists %I_delete on public.%I', tbl, tbl);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (user_id = auth.uid())', tbl, tbl);
  end loop;
end $$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.enforce_profile() from public;
revoke all on function public.enforce_ownership() from public;
revoke all on function public.assert_exercise(uuid, uuid) from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.activate_plan(uuid) from public;
grant execute on function public.activate_plan(uuid) to authenticated;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workout_plans to authenticated;
grant select, insert, update, delete on public.workout_plan_days to authenticated;
grant select, insert, update, delete on public.workout_plan_exercises to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_session_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
grant select, insert, update, delete on public.cardio_sessions to authenticated;
grant select, insert, update, delete on public.body_weight_logs to authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
grant select, insert, update, delete on public.progress_photos to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.schedule_overrides to authenticated;
grant select on public.completed_set_entries to authenticated;

revoke all on all tables in schema public from anon;
revoke all on public.completed_set_entries from anon;
