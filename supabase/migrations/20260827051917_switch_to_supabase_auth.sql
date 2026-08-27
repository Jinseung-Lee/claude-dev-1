-- 이메일+비밀번호 정식 인증으로 전환한다(docs/decisions/user-identity.md).
-- 이제 진짜 로그인 세션이 있으므로, 이메일 파라미터로 소유권을 검증하던
-- security definer 함수 대신 auth.uid() 기반 RLS로 바꾼다. 기존 travelers
-- 테이블은 auth.users와 중복되므로 제거하고, trips가 auth.users(id)를 직접
-- 참조한다. 기존 데이터는 테스트 데이터라 이관하지 않는다(스펙에 명시).

drop function if exists get_trip(uuid, text);
drop function if exists list_my_trips(text);
drop function if exists create_trip(text, jsonb);
drop function if exists get_or_create_traveler(text);

drop table if exists trip_cities;
drop table if exists trips;
drop table if exists travelers;

create table trips (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table trips enable row level security;

create policy "select own trips" on trips
for select to authenticated
using ((select auth.uid()) = traveler_id);

create policy "insert own trips" on trips
for insert to authenticated
with check ((select auth.uid()) = traveler_id);

create table trip_cities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  order_index integer not null,
  city_name text not null,
  latitude double precision,
  longitude double precision,
  start_date date not null,
  end_date date not null,
  constraint trip_cities_date_order check (end_date >= start_date)
);

alter table trip_cities enable row level security;

create index trip_cities_trip_id_idx on trip_cities (trip_id);
create index trips_traveler_id_idx on trips (traveler_id);

create policy "select own trip cities" on trip_cities
for select to authenticated
using (
  trip_id in (select id from trips where traveler_id = (select auth.uid()))
);

create policy "insert own trip cities" on trip_cities
for insert to authenticated
with check (
  trip_id in (select id from trips where traveler_id = (select auth.uid()))
);

-- 여행 일정 하나(도시별 체류 기간 목록)를 만든다. 호출한 사용자(auth.uid())
-- 소유로 만든다. p_cities는
-- [{"city_name":"..","start_date":"..","end_date":"..","latitude":..,"longitude":..}, ...] 형태다.
create or replace function create_trip(p_cities jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_city jsonb;
  v_index integer := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if jsonb_array_length(p_cities) = 0 then
    raise exception 'at least one city is required';
  end if;

  insert into trips (traveler_id) values (auth.uid()) returning id into v_trip_id;

  for v_city in select * from jsonb_array_elements(p_cities)
  loop
    insert into trip_cities (
      trip_id, order_index, city_name, latitude, longitude, start_date, end_date
    ) values (
      v_trip_id,
      v_index,
      v_city ->> 'city_name',
      nullif(v_city ->> 'latitude', '')::double precision,
      nullif(v_city ->> 'longitude', '')::double precision,
      (v_city ->> 'start_date')::date,
      (v_city ->> 'end_date')::date
    );
    v_index := v_index + 1;
  end loop;

  return v_trip_id;
end;
$$;

-- 현재 로그인한 사용자의 여행 목록을 반환한다. RLS가 이미 본인 것만
-- 걸러주므로 이 함수는 요약(도시 이름 배열)만 붙여준다.
create or replace function list_my_trips()
returns table (
  trip_id uuid,
  created_at timestamptz,
  city_names text[]
)
language sql
security invoker
set search_path = public
as $$
  select
    t.id,
    t.created_at,
    array_agg(tc.city_name order by tc.order_index)
  from trips t
  join trip_cities tc on tc.trip_id = t.id
  group by t.id, t.created_at
  order by t.created_at desc;
$$;

-- 여행 하나의 도시별 체류 구간 상세를 반환한다. RLS가 본인 소유가 아니면
-- 자동으로 빈 결과를 준다(다른 사용자의 여행을 볼 수 없게 하는 격리 지점).
create or replace function get_trip(p_trip_id uuid)
returns table (
  city_name text,
  latitude double precision,
  longitude double precision,
  start_date date,
  end_date date,
  order_index integer
)
language sql
security invoker
set search_path = public
as $$
  select tc.city_name, tc.latitude, tc.longitude, tc.start_date, tc.end_date, tc.order_index
  from trip_cities tc
  join trips t on t.id = tc.trip_id
  where tc.trip_id = p_trip_id
  order by tc.order_index;
$$;
