-- Permite intercambiar dos días de la rutina sin borrar el historial.
alter table public.workout_plan_days drop constraint if exists workout_plan_days_plan_id_weekday_key;
alter table public.workout_plan_days drop constraint if exists workout_plan_days_plan_weekday_key;
alter table public.workout_plan_days
  add constraint workout_plan_days_plan_weekday_key unique (plan_id, weekday) deferrable initially deferred;

create or replace function public.swap_plan_days(p_day_a uuid, p_day_b uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  day_a public.workout_plan_days%rowtype;
  day_b public.workout_plan_days%rowtype;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;
  select * into day_a from public.workout_plan_days where id = p_day_a and user_id = auth.uid();
  select * into day_b from public.workout_plan_days where id = p_day_b and user_id = auth.uid();
  if day_a.id is null or day_b.id is null or day_a.plan_id <> day_b.plan_id then
    raise exception 'forbidden';
  end if;
  update public.workout_plan_days set weekday = day_b.weekday where id = day_a.id;
  update public.workout_plan_days set weekday = day_a.weekday where id = day_b.id;
end;
$$;

revoke all on function public.swap_plan_days(uuid, uuid) from public;
grant execute on function public.swap_plan_days(uuid, uuid) to authenticated;
