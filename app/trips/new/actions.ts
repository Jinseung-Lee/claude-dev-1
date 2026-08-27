"use server";

import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/session";
import { createTrip, type CityInput } from "@/lib/trips";
import { geocodeCity } from "@/lib/weather";

export type NewTripCity = {
  cityName: string;
  startDate: string;
  endDate: string;
};

export type CreateTripResult = { error?: string };

export async function createTripAction(
  cities: NewTripCity[]
): Promise<CreateTripResult> {
  const email = await getSessionEmail();
  if (!email) {
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
    const coords = await geocodeCity(c.cityName);
    resolved.push({
      cityName: c.cityName.trim(),
      startDate: c.startDate,
      endDate: c.endDate,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });
  }

  let tripId: string;
  try {
    tripId = await createTrip(email, resolved);
  } catch {
    return { error: "여행을 저장하는 중 문제가 발생했습니다." };
  }

  redirect(`/trips/${tripId}`);
}
