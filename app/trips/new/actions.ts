"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createTrip, type CityInput } from "@/lib/trips";
import { geocodeCity } from "@/lib/weather";

export type NewTripCity = {
  cityName: string;
  startDate: string;
  endDate: string;
  // 지도에서 마커를 클릭해 확정한 경우에만 채워진다. 텍스트로만 입력한
  // 경우는 null로 두고, 아래에서 서버가 다시 지오코딩한다.
  latitude: number | null;
  longitude: number | null;
};

export type CreateTripResult = { error?: string };

export async function createTripAction(
  cities: NewTripCity[]
): Promise<CreateTripResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  if (cities.length === 0) {
    return { error: "도시를 하나 이상 추가해주세요." };
  }

  for (const c of cities) {
    if (!c.cityName.trim()) return { error: "도시 이름을 입력해주세요." };
    if (!c.startDate || !c.endDate) {
      return { error: "체류 기간을 입력해주세요." };
    }
    if (c.endDate < c.startDate) {
      return { error: `${c.cityName}의 종료일이 시작일보다 빠릅니다.` };
    }
  }

  const resolved: CityInput[] = [];
  for (const c of cities) {
    let latitude = c.latitude;
    let longitude = c.longitude;
    if (latitude == null || longitude == null) {
      const coords = await geocodeCity(c.cityName);
      latitude = coords?.latitude ?? null;
      longitude = coords?.longitude ?? null;
    }
    resolved.push({
      cityName: c.cityName.trim(),
      startDate: c.startDate,
      endDate: c.endDate,
      latitude,
      longitude,
    });
  }

  let tripId: string;
  try {
    tripId = await createTrip(resolved);
  } catch {
    return { error: "여행을 저장하는 중 문제가 발생했습니다." };
  }

  redirect(`/trips/${tripId}`);
}
