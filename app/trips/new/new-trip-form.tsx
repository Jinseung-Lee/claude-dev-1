"use client";

import { useState, useTransition } from "react";
import { createTripAction, type NewTripCity } from "@/app/trips/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

function emptyCity(): NewTripCity {
  return { cityName: "", startDate: "", endDate: "" };
}

export function NewTripForm() {
  const [cities, setCities] = useState<NewTripCity[]>([emptyCity()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateCity(index: number, patch: Partial<NewTripCity>) {
    setCities((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }

  function addCity() {
    setCities((prev) => [...prev, emptyCity()]);
  }

  function removeCity(index: number) {
    setCities((prev) => prev.filter((_, i) => i !== index));
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
              <div className="flex flex-col gap-2">
                <Label htmlFor={`city-${index}`}>도시</Label>
                <Input
                  id={`city-${index}`}
                  value={city.cityName}
                  placeholder="예: 도쿄"
                  onChange={(e) =>
                    updateCity(index, { cityName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`start-${index}`}>시작일</Label>
                  <Input
                    id={`start-${index}`}
                    type="date"
                    value={city.startDate}
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
