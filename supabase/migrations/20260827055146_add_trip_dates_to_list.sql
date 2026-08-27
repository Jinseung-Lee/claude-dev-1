-- 마이 여행 목록 카드에 실제 여행 기간(도시별 체류 날짜)을 보여주기 위해
-- list_my_trips가 도시 이름뿐 아니라 각 도시의 체류 기간도 함께 반환하도록
-- 확장한다.

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
        'end_date', tc.end_date
      )
      order by tc.order_index
    )
  from trips t
  join trip_cities tc on tc.trip_id = t.id
  group by t.id, t.created_at
  order by t.created_at desc;
$$;
