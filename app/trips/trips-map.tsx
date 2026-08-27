"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TripSummary, TripSummaryCity } from "@/lib/trips";

// 도시 이름마다 고유한 색을 배정한다. 같은 이름이면 항상 같은 색이 나오도록
// 이름 문자열을 해시해서 미리 정한 팔레트에서 고른다.
const CITY_PALETTE = [
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

function colorForCity(cityName: string): string {
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = (hash * 31 + cityName.charCodeAt(i)) >>> 0;
  }
  return CITY_PALETTE[hash % CITY_PALETTE.length];
}

// 오늘로부터 여행 시작일까지 지난 일수에 따라 옅어지는 정도(0~1, 1이 가장
// 진함)를 계산한다. 1년(365일)이 지나면 가장 옅은 값으로 수렴한다.
const MAX_AGE_DAYS = 365;
const MIN_OPACITY = 0.2;

function opacityForStartDate(startDate: string): number {
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

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 두 지점 사이의 방향(도, 북쪽 기준 시계방향 근사)을 구해 화살표를 회전시킨다.
function bearing(from: TripSummaryCity, to: TripSummaryCity): number {
  const dLat = (to.latitude as number) - (from.latitude as number);
  const dLng = (to.longitude as number) - (from.longitude as number);
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function arrowIcon(angleDeg: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid ${color};transform:rotate(${angleDeg}deg);"></div>`,
    iconSize: [12, 10],
    iconAnchor: [6, 5],
  });
}

type TripLeg = {
  tripId: string;
  from: TripSummaryCity;
  to: TripSummaryCity;
  opacity: number;
  isFuture: boolean;
};

export function TripsMap({ trips }: { trips: TripSummary[] }) {
  const today = todayString();

  const legs: TripLeg[] = [];
  const points: {
    city: TripSummaryCity;
    tripId: string;
    opacity: number;
    isFuture: boolean;
  }[] = [];

  for (const trip of trips) {
    const withCoords = trip.cities.filter(
      (c) => c.latitude != null && c.longitude != null
    );
    if (withCoords.length === 0) continue;

    const tripStart = withCoords.reduce(
      (min, c) => (c.startDate < min ? c.startDate : min),
      withCoords[0].startDate
    );
    const opacity = opacityForStartDate(tripStart);
    const isFuture = tripStart > today;

    withCoords.forEach((city) => {
      points.push({ city, tripId: trip.tripId, opacity, isFuture });
    });

    for (let i = 0; i < withCoords.length - 1; i++) {
      legs.push({
        tripId: trip.tripId,
        from: withCoords[i],
        to: withCoords[i + 1],
        opacity,
        isFuture,
      });
    }
  }

  return (
    <div className="h-80 w-full overflow-hidden rounded-2xl">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {legs.map((leg, i) => {
          const color = colorForCity(leg.from.cityName);
          const mid: [number, number] = [
            ((leg.from.latitude as number) + (leg.to.latitude as number)) / 2,
            ((leg.from.longitude as number) + (leg.to.longitude as number)) /
              2,
          ];
          return (
            <React.Fragment key={`${leg.tripId}-${i}`}>
              <Polyline
                positions={[
                  [leg.from.latitude as number, leg.from.longitude as number],
                  [leg.to.latitude as number, leg.to.longitude as number],
                ]}
                pathOptions={{
                  color,
                  opacity: leg.opacity,
                  weight: 2,
                  dashArray: leg.isFuture ? "6 6" : undefined,
                }}
              />
              <Marker
                position={mid}
                icon={arrowIcon(bearing(leg.from, leg.to), color)}
                opacity={leg.opacity}
              />
            </React.Fragment>
          );
        })}
        {points.map((p, i) => (
          <CircleMarker
            key={`${p.tripId}-${p.city.cityName}-${i}`}
            center={[p.city.latitude as number, p.city.longitude as number]}
            radius={6}
            pathOptions={{
              color: colorForCity(p.city.cityName),
              fillColor: colorForCity(p.city.cityName),
              fillOpacity: p.opacity,
              opacity: p.opacity,
              dashArray: p.isFuture ? "3 3" : undefined,
            }}
          >
            <Popup>
              {p.city.cityName}
              <br />
              <span className="text-xs text-muted-foreground">
                {p.city.startDate} ~ {p.city.endDate}
                {p.isFuture && " (예정)"}
              </span>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
