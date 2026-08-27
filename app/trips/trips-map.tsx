"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TripSummary, TripSummaryCity } from "@/lib/trips";
import { colorForTrip, opacityForStartDate, isFutureStartDate } from "@/lib/trip-style";

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
  color: string;
  opacity: number;
  isFuture: boolean;
};

export function TripsMap({ trips }: { trips: TripSummary[] }) {
  const legs: TripLeg[] = [];
  const points: {
    city: TripSummaryCity;
    tripId: string;
    color: string;
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
    const color = colorForTrip(trip.tripId);
    const opacity = opacityForStartDate(tripStart);
    const isFuture = isFutureStartDate(tripStart);

    withCoords.forEach((city) => {
      points.push({ city, tripId: trip.tripId, color, opacity, isFuture });
    });

    for (let i = 0; i < withCoords.length - 1; i++) {
      legs.push({
        tripId: trip.tripId,
        from: withCoords[i],
        to: withCoords[i + 1],
        color,
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
                  color: leg.color,
                  opacity: leg.opacity,
                  weight: 2,
                  dashArray: leg.isFuture ? "6 6" : undefined,
                }}
              />
              <Marker
                position={mid}
                icon={arrowIcon(bearing(leg.from, leg.to), leg.color)}
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
              color: p.color,
              fillColor: p.color,
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
