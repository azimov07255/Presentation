-- Slaydo (taqdimot ilovasi) AI: ruxsat va kunlik limit. Edge Function "pres-ai" chaqiradi.
-- Ruxsat: faol hisob va (owner yoki "pres" guruhi). Guruhni owner foydalanuvchiga beradi.
create or replace function public.can_pres() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active() and (public.is_owner() or 'pres' = any(public.my_groups()));
$$;
revoke execute on function public.can_pres() from public, anon;
grant execute on function public.can_pres() to authenticated;

create table if not exists public.pres_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.pres_ai_usage enable row level security;
revoke all on public.pres_ai_usage from anon, authenticated;

create or replace function public.pres_ai_hit(p_limit integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c integer; own boolean;
begin
  if not public.can_pres() then raise exception 'ruxsat yo''q'; end if;
  own := public.is_owner();
  insert into public.pres_ai_usage (user_id, day, n) values (auth.uid(), (now() at time zone 'utc')::date, 1)
    on conflict (user_id, day) do update set n = public.pres_ai_usage.n + 1 returning n into c;
  delete from public.pres_ai_usage where day < (now() at time zone 'utc')::date - 14;
  if not own and c > greatest(1, coalesce(p_limit, 30)) then
    raise exception 'Bugungi AI limiti tugadi (%). Ertaga qayta urinib ko''ring.', p_limit;
  end if;
  return jsonb_build_object('used', c, 'limit', case when own then null else p_limit end);
end $$;
revoke execute on function public.pres_ai_hit(integer) from public, anon;
grant execute on function public.pres_ai_hit(integer) to authenticated;
