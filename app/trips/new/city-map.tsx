"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { searchCities, type CitySearchResult } from "@/lib/weather";

export type MapCity = {
  cityName: string;
  latitude: number | null;
  longitude: number | null;
};

const confirmedIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#16a34a;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const candidateIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitToConfirmedCities({ cities }: { cities: MapCity[] }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = cities
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => [c.latitude as number, c.longitude as number]);
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 6);
    }
  }, [cities, map]);
  return null;
}

export function CityMap({
  cities,
  activeQuery,
  onSelectCity,
}: {
  cities: MapCity[];
  activeQuery: string;
  onSelectCity: (city: CitySearchResult) => void;
}) {
  const [candidates, setCandidates] = useState<CitySearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!activeQuery.trim()) {
      setCandidates([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCities(activeQuery, 5);
      setCandidates(results);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeQuery]);

  const confirmed = cities.filter(
    (c) => c.latitude != null && c.longitude != null
  );

  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl">
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
        {confirmed.map((c, i) => (
          <Marker
            key={`confirmed-${i}-${c.cityName}`}
            position={[c.latitude as number, c.longitude as number]}
            icon={confirmedIcon}
          >
            <Popup>{c.cityName}</Popup>
          </Marker>
        ))}
        {candidates.map((c, i) => (
          <Marker
            key={`candidate-${i}-${c.name}`}
            position={[c.latitude, c.longitude]}
            icon={candidateIcon}
            eventHandlers={{ click: () => onSelectCity(c) }}
          >
            <Popup>
              {c.name}
              {c.country ? ` · ${c.country}` : ""}
              <br />
              <span className="text-xs text-muted-foreground">
                클릭하면 이 도시로 선택됩니다
              </span>
            </Popup>
          </Marker>
        ))}
        <FitToConfirmedCities cities={confirmed} />
      </MapContainer>
    </div>
  );
}
