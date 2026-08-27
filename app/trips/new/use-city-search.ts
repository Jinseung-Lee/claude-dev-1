"use client";

import { useEffect, useRef, useState } from "react";
import { searchCities, type CitySearchResult } from "@/lib/weather";

// 검색어(도시 이름 입력값)가 바뀔 때마다 디바운스 후 Open-Meteo 검색
// 결과를 가져온다. 지도 마커와 드롭다운 목록이 이 결과를 함께 쓴다.
export function useCitySearch(query: string): CitySearchResult[] {
  const [candidates, setCandidates] = useState<CitySearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setCandidates([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCities(query, 5);
      setCandidates(results);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return candidates;
}
