// 마이 여행 지도와 여행 카드가 함께 쓰는 색상·투명도 규칙.
// 여행(카드) 하나마다 고유한 색을 배정하고, 그 여행의 체류 시작일이
// 오늘에서 멀어질수록(과거로 갈수록) 옅게 표현한다.

const TRIP_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
];

export function colorForTrip(tripId: string): string {
  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    hash = (hash * 31 + tripId.charCodeAt(i)) >>> 0;
  }
  return TRIP_PALETTE[hash % TRIP_PALETTE.length];
}

const MAX_AGE_DAYS = 365; // 1년이 지나면 가장 옅은 값으로 수렴한다.
const MIN_OPACITY = 0.2;

export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 여행 시작일 기준 진하기(0~1, 1이 가장 진함). 아직 오지 않은(미래) 여행은
// 가장 진하게 표시한다.
export function opacityForStartDate(startDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.max(
    0,
    Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const t = Math.min(days / MAX_AGE_DAYS, 1);
  return 1 - t * (1 - MIN_OPACITY);
}

export function isFutureStartDate(startDate: string): boolean {
  return startDate > todayString();
}
