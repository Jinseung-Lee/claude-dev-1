import Link from "next/link";
import { listMyTrips, type TripSummaryCity } from "@/lib/trips";
import { buttonVariants } from "@/components/ui/button";
import { TripsMapLoader } from "@/app/trips/trips-map-loader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

function tripRange(cities: TripSummaryCity[]): string {
  const start = cities.reduce(
    (min, c) => (c.startDate < min ? c.startDate : min),
    cities[0].startDate
  );
  const end = cities.reduce(
    (max, c) => (c.endDate > max ? c.endDate : max),
    cities[0].endDate
  );
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

export default async function TripsPage() {
  const trips = await listMyTrips();

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 self-center">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">마이 여행</h1>
        <Link href="/trips/new" className={buttonVariants({})}>
          새 여행 만들기
        </Link>
      </div>

      {trips.length > 0 && (
        <div className="flex flex-col gap-2">
          <TripsMapLoader trips={trips} />
          <p className="text-xs text-muted-foreground">
            같은 도시는 같은 색으로, 오래된 여행일수록 옅은 색으로
            표시됩니다. 아직 오지 않은(예정) 여행은 점선으로 표시됩니다.
          </p>
        </div>
      )}

      {trips.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>아직 등록된 여행이 없습니다</CardTitle>
            <CardDescription>
              방문 도시와 체류 기간을 등록하면 날짜별 날씨를 확인할 수
              있습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <Link key={trip.tripId} href={`/trips/${trip.tripId}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>
                    {trip.cities.map((c) => c.cityName).join(" → ")}
                  </CardTitle>
                  <CardDescription>
                    <div className="mt-1 flex flex-col gap-2">
                      <span className="text-foreground">
                        {tripRange(trip.cities)}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {trip.cities.map((c, i) => (
                          <span
                            key={`${c.cityName}-${i}`}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs"
                          >
                            {c.cityName} {formatDate(c.startDate)}~
                            {formatDate(c.endDate)}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs">
                        {new Date(trip.createdAt).toLocaleDateString("ko-KR")}
                        에 만든 여행
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
