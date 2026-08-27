-- 마이 여행 지도(docs/specs/trip-map-overview/)에서 각 도시의 경로를 그리려면
-- 좌표가 필요하다. list_my_trips가 반환하는 cities 배열에 위도·경도를 추가한다.

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
  order by t.created_at desc;
$$;
