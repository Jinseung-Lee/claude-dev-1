-- 여행 일정별 날씨 조회 (첫 스펙) 스키마
-- 비밀번호 없는 이메일 식별을 쓰므로(docs/decisions/user-identity.md), 진짜 인증 세션이
-- 없다. 테이블은 RLS로 완전히 잠그고, 이메일 파라미터로 소유권을 검증하는
-- security definer 함수를 통해서만 접근한다.

create table travelers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table travelers enable row level security;

create table trips (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references travelers (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table trips enable row level security;

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

-- 이메일로 여행자를 찾거나 만든다. 이메일은 대소문자·공백을 정규화해서 비교한다.
create or replace function get_or_create_traveler(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  if v_email is null or v_email = '' then
    raise exception 'email is required';
  end if;

  select id into v_id from travelers where email = v_email;

  if v_id is null then
    insert into travelers (email) values (v_email) returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- 여행 일정 하나(도시별 체류 기간 목록)를 만든다. p_cities는
-- [{"city_name":"..","start_date":"..","end_date":"..","latitude":..,"longitude":..}, ...] 형태다.
create or replace function create_trip(p_email text, p_cities jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_traveler_id uuid;
  v_trip_id uuid;
  v_city jsonb;
  v_index integer := 0;
begin
  if jsonb_array_length(p_cities) = 0 then
    raise exception 'at least one city is required';
  end if;

  v_traveler_id := get_or_create_traveler(p_email);

  insert into trips (traveler_id) values (v_traveler_id) returning id into v_trip_id;

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

-- 이메일 소유자의 여행 목록을 반환한다(요약: 여행 id, 생성일, 도시 이름 배열).
create or replace function list_my_trips(p_email text)
returns table (
  trip_id uuid,
  created_at timestamptz,
  city_names text[]
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.created_at,
    array_agg(tc.city_name order by tc.order_index)
  from trips t
  join travelers tr on tr.id = t.traveler_id
  join trip_cities tc on tc.trip_id = t.id
  where tr.email = lower(trim(p_email))
  group by t.id, t.created_at
  order by t.created_at desc;
$$;

-- 여행 하나의 도시별 체류 구간 상세를 반환한다. 이메일이 그 여행의 소유자가 아니면
-- 아무 행도 반환하지 않는다(다른 사용자의 여행을 볼 수 없게 하는 격리 지점).
create or replace function get_trip(p_trip_id uuid, p_email text)
returns table (
  city_name text,
  latitude double precision,
  longitude double precision,
  start_date date,
  end_date date,
  order_index integer
)
language sql
security definer
set search_path = public
as $$
  select tc.city_name, tc.latitude, tc.longitude, tc.start_date, tc.end_date, tc.order_index
  from trip_cities tc
  join trips t on t.id = tc.trip_id
  join travelers tr on tr.id = t.traveler_id
  where tc.trip_id = p_trip_id
    and tr.email = lower(trim(p_email))
  order by tc.order_index;
$$;
