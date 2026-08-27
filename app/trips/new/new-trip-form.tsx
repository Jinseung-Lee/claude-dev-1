"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { createTripAction, type NewTripCity } from "@/app/trips/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { CitySearchResult } from "@/lib/weather";
import { useCitySearch } from "@/app/trips/new/use-city-search";

// Leaflet은 window가 필요해 서버에서 렌더링하면 오류가 나므로 클라이언트
// 전용으로만 로드한다.
const CityMap = dynamic(
  () => import("@/app/trips/new/city-map").then((m) => m.CityMap),
  { ssr: false, loading: () => <div className="h-72 w-full rounded-2xl bg-muted" /> }
);

function emptyCity(): NewTripCity {
  return {
    cityName: "",
    startDate: "",
    endDate: "",
    latitude: null,
    longitude: null,
  };
}

export function NewTripForm() {
  const [cities, setCities] = useState<NewTripCity[]>([emptyCity()]);
  const [activeIndex, setActiveIndex] = useState(0);
  // 후보를 클릭해 도시를 확정한 직후에는, 입력값이 후보 이름과 같아져
  // 검색어가 안 바뀌므로 후보 목록이 그대로 남는다. 그래서 "이 인덱스는
  // 방금 확정했다"를 따로 표시해 드롭다운을 닫아 준다. 다시 입력하면
  // (onChange) 풀린다.
  const [dismissedIndex, setDismissedIndex] = useState<number | null>(null);
  // 드롭다운에서 방향키로 훑고 있는 후보의 위치.
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const candidates = useCitySearch(cities[activeIndex]?.cityName ?? "");

  function updateCity(index: number, patch: Partial<NewTripCity>) {
    setCities((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }

  function addCity() {
    setCities((prev) => [...prev, emptyCity()]);
    setActiveIndex(cities.length);
  }

  function removeCity(index: number) {
    setCities((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((prev) => Math.max(0, Math.min(prev, cities.length - 2)));
  }

  function selectCandidate(index: number, c: CitySearchResult) {
    updateCity(index, {
      cityName: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
    });
    setDismissedIndex(index);
  }

  function handleMapSelect(city: CitySearchResult) {
    selectCandidate(activeIndex, city);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createTripAction(cities);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6 self-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        새 여행 만들기
      </h1>

      <CityMap
        cities={cities}
        candidates={candidates}
        onSelectCity={handleMapSelect}
      />
      <p className="text-xs text-muted-foreground">
        지도에서 도시를 검색하려면 아래에서 편집할 도시 칸을 먼저
        클릭하세요. 도시 이름을 입력하면 후보가 지도에 파란 점으로,
        입력칸 아래 목록으로도 뜹니다. 마커나 목록 중 아무거나 클릭하면
        그 도시로 확정됩니다(초록 점).
      </p>

      <div className="flex flex-col gap-4">
        {cities.map((city, index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}번째 방문 도시
                </span>
                {cities.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCity(index)}
                  >
                    삭제
                  </Button>
                )}
              </div>
              <div className="relative flex flex-col gap-2">
                <Label htmlFor={`city-${index}`}>도시</Label>
                <Input
                  id={`city-${index}`}
                  value={city.cityName}
                  placeholder="예: 도쿄"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={
                    activeIndex === index &&
                    dismissedIndex !== index &&
                    city.cityName.trim().length > 0
                  }
                  onFocus={() => setActiveIndex(index)}
                  onChange={(e) => {
                    updateCity(index, {
                      cityName: e.target.value,
                      // 텍스트를 직접 고치면 지도에서 확정했던 좌표는
                      // 더 이상 유효하지 않으므로 비운다. 제출 시 서버가
                      // 다시 지오코딩한다.
                      latitude: null,
                      longitude: null,
                    });
                    setDismissedIndex(null);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={(e) => {
                    const isOpen =
                      activeIndex === index &&
                      dismissedIndex !== index &&
                      city.cityName.trim().length > 0 &&
                      candidates.length > 0;
                    if (!isOpen) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex(
                        (prev) => (prev + 1) % candidates.length
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex(
                        (prev) =>
                          (prev - 1 + candidates.length) % candidates.length
                      );
                    } else if (e.key === "Enter") {
                      const c = candidates[highlightedIndex];
                      if (c) {
                        e.preventDefault();
                        selectCandidate(index, c);
                      }
                    } else if (e.key === "Escape") {
                      setDismissedIndex(index);
                    }
                  }}
                />
                {activeIndex === index &&
                  dismissedIndex !== index &&
                  city.cityName.trim().length > 0 && (
                    <ul className="absolute top-full left-0 z-10 mt-1 w-full overflow-hidden rounded-2xl bg-popover shadow-lg ring-1 ring-foreground/5">
                      {candidates.length > 0 ? (
                        candidates.map((c, i) => (
                          <li key={`${c.name}-${i}`}>
                            <button
                              type="button"
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted ${
                                i === highlightedIndex ? "bg-muted" : ""
                              }`}
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() => setHighlightedIndex(i)}
                              onClick={() => selectCandidate(index, c)}
                            >
                              <span>{c.name}</span>
                              {c.country && (
                                <span className="text-xs text-muted-foreground">
                                  {c.country}
                                </span>
                              )}
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-2 text-sm text-muted-foreground">
                          검색 결과가 없습니다. 정식 명칭이나 3글자 이상으로
                          입력해보세요(예: 서울 → 서울특별시).
                        </li>
                      )}
                    </ul>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`start-${index}`}>시작일</Label>
                  <Input
                    id={`start-${index}`}
                    type="date"
                    value={city.startDate}
                    onFocus={() => setActiveIndex(index)}
                    onChange={(e) =>
                      updateCity(index, { startDate: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`end-${index}`}>종료일</Label>
                  <Input
                    id={`end-${index}`}
                    type="date"
                    value={city.endDate}
                    onFocus={() => setActiveIndex(index)}
                    onChange={(e) =>
                      updateCity(index, { endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addCity}>
        도시 추가
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={pending}>
        {pending ? "저장 중..." : "여행 만들기"}
      </Button>
    </div>
  );
}
