// Open-Meteo 무료 API로 지오코딩(도시명 -> 좌표)과 날짜별 예보를 가져온다.
// 인증이 필요 없고, 호출 시점마다 최신 데이터를 준다.

const FORECAST_MAX_DAYS = 16; // Open-Meteo가 신뢰할 수 있는 예보를 주는 대략적인 범위

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function geocodeCity(
  cityName: string
): Promise<Coordinates | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    cityName
  )}&count=1&language=ko&format=json`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    return { latitude: first.latitude, longitude: first.longitude };
  } catch {
    return null;
  }
}

export type DayWeather =
  | {
      status: "forecast";
      date: string;
      weatherCode: number;
      tempMax: number;
      tempMin: number;
      precipitationSum: number;
      precipitationProbability: number | null;
    }
  | { status: "out-of-range"; date: string }
  | { status: "unavailable"; date: string };

// Date -> 'YYYY-MM-DD'. toISOString()은 UTC로 변환하면서 로컬 타임존(예: KST)
// 자정을 전날로 밀어버리므로 쓰지 않는다. 로컬 캘린더 필드를 그대로 읽는다.
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    dates.push(toDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function fetchDailyWeather(
  coords: Coordinates | null,
  startDate: string,
  endDate: string
): Promise<DayWeather[]> {
  const allDates = enumerateDates(startDate, endDate);

  if (!coords) {
    return allDates.map((date) => ({ status: "unavailable", date }));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + FORECAST_MAX_DAYS - 1);

  const forecastableDates = allDates.filter((d) => {
    const dt = new Date(`${d}T00:00:00`);
    return dt >= today && dt <= maxDate;
  });

  const results = new Map<string, DayWeather>();
  for (const d of allDates) {
    results.set(d, { status: "out-of-range", date: d });
  }

  if (forecastableDates.length > 0) {
    const rangeStart = forecastableDates[0];
    const rangeEnd = forecastableDates[forecastableDates.length - 1];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&start_date=${rangeStart}&end_date=${rangeEnd}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const dates: string[] = data?.daily?.time ?? [];
        dates.forEach((date, i) => {
          results.set(date, {
            status: "forecast",
            date,
            weatherCode: data.daily.weather_code[i],
            tempMax: data.daily.temperature_2m_max[i],
            tempMin: data.daily.temperature_2m_min[i],
            precipitationSum: data.daily.precipitation_sum?.[i] ?? 0,
            precipitationProbability:
              data.daily.precipitation_probability_max?.[i] ?? null,
          });
        });
      }
    } catch {
      // 네트워크 오류 시 해당 날짜들은 out-of-range 상태로 남긴다.
    }
  }

  return allDates.map((d) => results.get(d)!);
}

// WMO 날씨 코드를 짧은 한글 설명으로 바꾼다.
export function describeWeatherCode(code: number): string {
  if (code === 0) return "맑음";
  if (code <= 2) return "구름 조금";
  if (code === 3) return "흐림";
  if (code === 45 || code === 48) return "안개";
  if (code >= 51 && code <= 57) return "이슬비";
  if (code >= 61 && code <= 67) return "비";
  if (code >= 71 && code <= 77) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code >= 85 && code <= 86) return "눈 날림";
  if (code >= 95) return "뇌우";
  return "알 수 없음";
}
