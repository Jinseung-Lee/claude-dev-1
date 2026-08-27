"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type XAxisTickContentProps,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { describeWeatherCode, type DayWeather } from "@/lib/weather";

type CityDay = {
  cityName: string;
  weather: DayWeather;
};

type DateGroup = {
  date: string;
  cityDays: CityDay[];
};

function formatShortDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatLongDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

const chartConfig: ChartConfig = {
  tempMax: { label: "최고기온", color: "var(--chart-1)" },
  tempMin: { label: "최저기온", color: "var(--chart-2)" },
};

// 값이 없는 날짜(예보 범위 밖 등)는 라인에 점이 그려지지 않으므로, X축 날짜
// 라벨 자체를 클릭 가능하게 만들어 모든 날짜를 선택할 수 있게 한다.
function ClickableDateTick(
  props: XAxisTickContentProps & { onSelect: (date: string) => void }
) {
  const { x, y, payload, onSelect } = props;
  const date = String(payload.value);
  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect(date)}
    >
      <rect x={-16} y={0} width={32} height={20} fill="transparent" />
      <text
        x={0}
        y={12}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {formatShortDate(date)}
      </text>
    </g>
  );
}

export function TripTimeline({ dateGroups }: { dateGroups: DateGroup[] }) {
  const [selectedDate, setSelectedDate] = useState<string>(
    dateGroups[0]?.date ?? ""
  );

  const chartData = dateGroups.map((group) => {
    const forecastCity = group.cityDays.find(
      (c) => c.weather.status === "forecast"
    );
    const weather =
      forecastCity?.weather.status === "forecast"
        ? forecastCity.weather
        : null;
    return {
      date: group.date,
      label: formatShortDate(group.date),
      tempMax: weather?.tempMax ?? null,
      tempMin: weather?.tempMin ?? null,
    };
  });

  const selectedGroup =
    dateGroups.find((g) => g.date === selectedDate) ?? dateGroups[0];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>전체 기간 기온 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="w-full">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tick={(props: XAxisTickContentProps) => (
                  <ClickableDateTick {...props} onSelect={setSelectedDate} />
                )}
              />
              <YAxis
                width={32}
                tickFormatter={(v) => `${v}°`}
                domain={["auto", "auto"]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="tempMax"
                stroke="var(--color-tempMax)"
                strokeWidth={2}
                connectNulls
                dot={(dotProps: DotItemDotProps) => {
                  const { cx, cy, index } = dotProps;
                  const payload = dotProps.payload as {
                    date: string;
                    tempMax: number | null;
                  };
                  if (!payload || payload.tempMax == null || cx == null)
                    return <g key={`tempMax-${index}`} />;
                  return (
                    <circle
                      key={`tempMax-${index}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="var(--color-tempMax)"
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedDate(payload.date)}
                    />
                  );
                }}
              />
              <Line
                dataKey="tempMin"
                stroke="var(--color-tempMin)"
                strokeWidth={2}
                connectNulls
                dot={(dotProps: DotItemDotProps) => {
                  const { cx, cy, index } = dotProps;
                  const payload = dotProps.payload as {
                    date: string;
                    tempMin: number | null;
                  };
                  if (!payload || payload.tempMin == null || cx == null)
                    return <g key={`tempMin-${index}`} />;
                  return (
                    <circle
                      key={`tempMin-${index}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="var(--color-tempMin)"
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedDate(payload.date)}
                    />
                  );
                }}
              />
            </LineChart>
          </ChartContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            그래프의 날짜를 클릭하면 아래에서 그날의 날씨를 볼 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {selectedGroup && (
        <Card>
          <CardHeader>
            <CardTitle>{formatLongDate(selectedGroup.date)} 상세</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {selectedGroup.cityDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                일정 정보 없음
              </p>
            ) : (
              selectedGroup.cityDays.map(({ cityName, weather }) => (
                <div
                  key={cityName}
                  className="rounded-xl bg-muted/50 px-4 py-3"
                >
                  <div className="mb-2 font-medium text-foreground">
                    {cityName}
                  </div>
                  {weather.status === "forecast" && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <dt>날씨</dt>
                      <dd className="text-foreground">
                        {describeWeatherCode(weather.weatherCode)}
                      </dd>
                      <dt>최고 / 최저 기온</dt>
                      <dd className="text-foreground">
                        {Math.round(weather.tempMax)}° /{" "}
                        {Math.round(weather.tempMin)}°
                      </dd>
                      <dt>강수 여부</dt>
                      <dd className="text-foreground">
                        {weather.precipitationSum > 0 ? "비/눈 옴" : "없음"}
                      </dd>
                      <dt>강수량</dt>
                      <dd className="text-foreground">
                        {weather.precipitationSum} mm
                        {weather.precipitationProbability != null &&
                          ` (확률 ${weather.precipitationProbability}%)`}
                      </dd>
                    </dl>
                  )}
                  {weather.status === "out-of-range" && (
                    <p className="text-sm text-muted-foreground">
                      예보 범위 밖 (가까워지면 표시됩니다)
                    </p>
                  )}
                  {weather.status === "unavailable" && (
                    <p className="text-sm text-muted-foreground">
                      위치를 찾지 못해 날씨를 불러올 수 없습니다
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
