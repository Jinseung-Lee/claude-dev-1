"use client";

import dynamic from "next/dynamic";
import type { TripSummary } from "@/lib/trips";

// Leaflet은 window가 필요해 서버에서 렌더링하면 오류가 나므로 클라이언트
// 전용으로만 로드한다. ssr:false는 클라이언트 컴포넌트 안에서만 쓸 수
// 있어, page.tsx(서버 컴포넌트)가 아니라 이 래퍼에서 호출한다.
const TripsMap = dynamic(
  () => import("@/app/trips/trips-map").then((m) => m.TripsMap),
  { ssr: false, loading: () => <div className="h-80 w-full rounded-2xl bg-muted" /> }
);

export function TripsMapLoader({ trips }: { trips: TripSummary[] }) {
  return <TripsMap trips={trips} />;
}
