-- 마이 여행 카드를 등록한 날짜가 아니라 실제 여행 날짜(체류 시작일) 기준으로
-- 정렬한다. 가장 최근이거나 아직 오지 않은(미래) 여행이 맨 위로 온다.

drop function if exists list_my_trips();

create function list_my_trips()
returns table (
  trip_id uuid,
  created_at timestamptz,
  cities jsonb
)
language sql
security invoker
set search_path = public
as $$
  select
    t.id,
    t.created_at,
    jsonb_agg(
      jsonb_build_object(
        'city_name', tc.city_name,
        'start_date', tc.start_date,
        'end_date', tc.end_date,
        'latitude', tc.latitude,
        'longitude', tc.longitude
      )
      order by tc.order_index
    )
  from trips t
  join trip_cities tc on tc.trip_id = t.id
  group by t.id, t.created_at
  order by min(tc.start_date) desc;
$$;
