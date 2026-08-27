import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/session";
import { getTrip } from "@/lib/trips";
import {
  fetchDailyWeather,
  describeWeatherCode,
  enumerateDates,
  type DayWeather,
} from "@/lib/weather";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TripTimeline } from "@/app/trips/[id]/trip-timeline";

type CityDay = {
  cityName: string;
  weather: DayWeather;
};

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default async function TripDetailPage(
  props: PageProps<"/trips/[id]">
) {
  const email = await getSessionEmail();
  if (!email) redirect("/");

  const { id } = await props.params;
  const cities = await getTrip(id, email);

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
          if (weather) cityDays.push({ cityName: city.cityName, weather });
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

      <div className="flex flex-col gap-3">
        {dateGroups.map(({ date, cityDays }) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle>{formatDate(date)}</CardTitle>
              <CardDescription>
                {cityDays.length === 0 ? (
                  "일정 정보 없음"
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {cityDays.map(({ cityName, weather }) => (
                      <div
                        key={cityName}
                        className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
                      >
                        <span className="font-medium text-foreground">
                          {cityName}
                        </span>
                        <span>
                          {weather.status === "forecast" &&
                            `${describeWeatherCode(weather.weatherCode)} · ${Math.round(
                              weather.tempMin
                            )}° ~ ${Math.round(weather.tempMax)}°`}
                          {weather.status === "out-of-range" &&
                            "예보 범위 밖 (가까워지면 표시됩니다)"}
                          {weather.status === "unavailable" &&
                            "위치를 찾지 못해 날씨를 불러올 수 없습니다"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
