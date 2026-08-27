import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrip } from "@/lib/trips";
import {
  fetchDailyWeather,
  enumerateDates,
  type DayWeather,
} from "@/lib/weather";
import { buttonVariants } from "@/components/ui/button";
import { TripTimeline } from "@/app/trips/[id]/trip-timeline";

type CityDay = {
  cityName: string;
  latitude: number | null;
  longitude: number | null;
  weather: DayWeather;
};

export default async function TripDetailPage(
  props: PageProps<"/trips/[id]">
) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await props.params;
  const cities = await getTrip(id);

  if (cities.length === 0) {
    return (
      <div className="flex w-full max-w-xl flex-col items-center gap-4 self-center py-16 text-center">
        <h1 className="text-xl font-semibold">여행을 찾을 수 없습니다</h1>
        <p className="text-muted-foreground">
          삭제되었거나, 이 계정으로 만든 여행이 아닙니다.
        </p>
        <Link href="/trips" className={buttonVariants({})}>
          마이 여행으로 돌아가기
        </Link>
      </div>
    );
  }

  const weatherByCity = await Promise.all(
    cities.map(async (city) => {
      const coords =
        city.latitude != null && city.longitude != null
          ? { latitude: city.latitude, longitude: city.longitude }
          : null;
      const days = await fetchDailyWeather(
        coords,
        city.startDate,
        city.endDate
      );
      const byDate = new Map(days.map((d) => [d.date, d]));
      return { city, byDate };
    })
  );

  const overallStart = cities.reduce(
    (min, c) => (c.startDate < min ? c.startDate : min),
    cities[0].startDate
  );
  const overallEnd = cities.reduce(
    (max, c) => (c.endDate > max ? c.endDate : max),
    cities[0].endDate
  );
  const allDates = enumerateDates(overallStart, overallEnd);

  const dateGroups: { date: string; cityDays: CityDay[] }[] = allDates.map(
    (date) => {
      const cityDays: CityDay[] = [];
      for (const { city, byDate } of weatherByCity) {
        if (date >= city.startDate && date <= city.endDate) {
          const weather = byDate.get(date);
          if (weather) {
            cityDays.push({
              cityName: city.cityName,
              latitude: city.latitude,
              longitude: city.longitude,
              weather,
            });
          }
        }
      }
      return { date, cityDays };
    }
  );

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 self-center">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {cities.map((c) => c.cityName).join(" → ")}
        </h1>
        <Link href="/trips" className={buttonVariants({ variant: "outline" })}>
          목록으로
        </Link>
      </div>

      <TripTimeline dateGroups={dateGroups} />
    </div>
  );
}
