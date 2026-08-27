import { createClient } from "@/lib/server";

export type TripSummaryCity = {
  cityName: string;
  startDate: string;
  endDate: string;
  latitude: number | null;
  longitude: number | null;
};

export type TripSummary = {
  tripId: string;
  createdAt: string;
  cities: TripSummaryCity[];
};

export async function listMyTrips(): Promise<TripSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_trips");
  if (error) throw new Error(error.message);
  return (data ?? []).map(
    (row: {
      trip_id: string;
      created_at: string;
      cities: {
        city_name: string;
        start_date: string;
        end_date: string;
        latitude: number | null;
        longitude: number | null;
      }[];
    }) => ({
      tripId: row.trip_id,
      createdAt: row.created_at,
      cities: row.cities.map((c) => ({
        cityName: c.city_name,
        startDate: c.start_date,
        endDate: c.end_date,
        latitude: c.latitude,
        longitude: c.longitude,
      })),
    })
  );
}

export type CityInput = {
  cityName: string;
  startDate: string;
  endDate: string;
  latitude: number | null;
  longitude: number | null;
};

export async function createTrip(cities: CityInput[]): Promise<string> {
  const supabase = await createClient();
  const payload = cities.map((c) => ({
    city_name: c.cityName,
    start_date: c.startDate,
    end_date: c.endDate,
    latitude: c.latitude,
    longitude: c.longitude,
  }));
  const { data, error } = await supabase.rpc("create_trip", {
    p_cities: payload,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export type TripCityDetail = {
  cityName: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  orderIndex: number;
};

export async function getTrip(tripId: string): Promise<TripCityDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_trip", {
    p_trip_id: tripId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(
    (row: {
      city_name: string;
      latitude: number | null;
      longitude: number | null;
      start_date: string;
      end_date: string;
      order_index: number;
    }) => ({
      cityName: row.city_name,
      latitude: row.latitude,
      longitude: row.longitude,
      startDate: row.start_date,
      endDate: row.end_date,
      orderIndex: row.order_index,
    })
  );
}
