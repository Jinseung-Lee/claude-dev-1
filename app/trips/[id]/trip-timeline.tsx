"use client";

import { useEffect, useState } from "react";
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
import {
  describeWeatherCode,
  fetchHourlyWeather,
  type DayWeather,
  type HourWeather,
} from "@/lib/weather";

type CityDay = {
  cityName: string;
  latitude: number | null;
  longitude: number | null;
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

function formatHour(time: string): string {
  return `${time.slice(11, 13)}시`;
}

const chartConfig: ChartConfig = {
  tempMax: { label: "최고기온", color: "var(--chart-1)" },
  tempMin: { label: "최저기온", color: "var(--chart-2)" },
};

// 값이 없는 날짜(예보 범위 밖 등)는 라인에 점이 그려지지 않으므로, X축 날짜
// 라벨 자체를 클릭 가능하게 만들어 모든 날짜를 선택할 수 있게 한다. 날짜
// 아래에는 그날 머무는 도시 이름(대표 도시 하나)도 함께 보여준다.
function ClickableDateTick(
  props: XAxisTickContentProps & {
    onSelect: (date: string) => void;
    cityByDate: Map<string, string>;
  }
) {
  const { x, y, payload, onSelect, cityByDate } = props;
  const date = String(payload.value);
  const city = cityByDate.get(date);
  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect(date)}
    >
      <rect x={-24} y={0} width={48} height={32} fill="transparent" />
      <text
        x={0}
        y={12}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {formatShortDate(date)}
      </text>
      {city && (
        <text
          x={0}
          y={26}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          {city}
        </text>
      )}
    </g>
  );
}

// 하루 24시간을 다 보여주면 너무 빽빽해지므로 3시간 간격으로만 추린다.
function pickHours(hours: HourWeather[]): HourWeather[] {
  return hours.filter((h) => {
    const hour = Number(h.time.slice(11, 13));
    return hour % 3 === 0;
  });
}

function HourlyStrip({
  latitude,
  longitude,
  date,
}: {
  latitude: number | null;
  longitude: number | null;
  date: string;
}) {
  const [hours, setHours] = useState<HourWeather[] | null | "loading">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    setHours("loading");
    fetchHourlyWeather(
      latitude != null && longitude != null ? { latitude, longitude } : null,
      date
    ).then((result) => {
      if (!cancelled) setHours(result);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, date]);

  if (hours === "loading") {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        시간대별 날씨를 불러오는 중...
      </p>
    );
  }
  if (!hours || hours.length === 0) return null;

  return (
    <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
      {pickHours(hours).map((h) => (
        <div
          key={h.time}
          className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-background px-3 py-2 text-center"
        >
          <span className="text-xs text-muted-foreground">
            {formatHour(h.time)}
          </span>
          <span className="text-xs">{describeWeatherCode(h.weatherCode)}</span>
          <span className="text-sm font-medium text-foreground">
            {Math.round(h.temperature)}°
          </span>
          {h.precipitationProbability != null && (
            <span className="text-[10px] text-muted-foreground">
              강수 {h.precipitationProbability}%
            </span>
          )}
        </div>
      ))}
    </div>
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

  const cityByDate = new Map(
    dateGroups
      .filter((g) => g.cityDays.length > 0)
      .map((g) => [g.date, g.cityDays[0].cityName])
  );

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
            <LineChart data={chartData} margin={{ bottom: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                height={40}
                tick={(props: XAxisTickContentProps) => (
                  <ClickableDateTick
                    {...props}
                    onSelect={setSelectedDate}
                    cityByDate={cityByDate}
                  />
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
              selectedGroup.cityDays.map(
                ({ cityName, latitude, longitude, weather }) => (
                  <div
                    key={cityName}
                    className="rounded-xl bg-muted/50 px-4 py-3"
                  >
                    <div className="mb-2 font-medium text-foreground">
                      {cityName}
                    </div>
                    {weather.status === "forecast" && (
                      <>
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
                            {weather.precipitationSum > 0
                              ? "비/눈 옴"
                              : "없음"}
                          </dd>
                          <dt>강수량</dt>
                          <dd className="text-foreground">
                            {weather.precipitationSum} mm
                            {weather.precipitationProbability != null &&
                              ` (확률 ${weather.precipitationProbability}%)`}
                          </dd>
                        </dl>
                        <HourlyStrip
                          latitude={latitude}
                          longitude={longitude}
                          date={selectedGroup.date}
                        />
                      </>
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
                )
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
