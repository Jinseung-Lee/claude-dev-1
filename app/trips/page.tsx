import Link from "next/link";
import { getSessionEmail } from "@/lib/session";
import { listMyTrips } from "@/lib/trips";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default async function TripsPage() {
  const email = (await getSessionEmail())!;
  const trips = await listMyTrips(email);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 self-center">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">마이 여행</h1>
        <Link href="/trips/new" className={buttonVariants({})}>
          새 여행 만들기
        </Link>
      </div>

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
                  <CardTitle>{trip.cityNames.join(" → ")}</CardTitle>
                  <CardDescription>
                    {new Date(trip.createdAt).toLocaleDateString("ko-KR")}에
                    만든 여행
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
