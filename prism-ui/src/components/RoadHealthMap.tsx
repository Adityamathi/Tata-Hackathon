"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface HazardPoint {
  lat: number;
  lng: number;
  type: string;
  severity: string;
  area_m2: number;
  date: string;
}

const hazardData: HazardPoint[] = [
  { lat: 18.5204, lng: 73.8567, type: "Pothole", severity: "CRITICAL", area_m2: 2.4, date: "2026-06-28" },
  { lat: 18.5314, lng: 73.8446, type: "Alligator Crack", severity: "HIGH", area_m2: 4.1, date: "2026-06-27" },
  { lat: 18.5148, lng: 73.8689, type: "Pothole", severity: "HIGH", area_m2: 1.8, date: "2026-06-26" },
  { lat: 18.5432, lng: 73.8315, type: "Transverse Crack", severity: "MODERATE", area_m2: 0.9, date: "2026-06-25" },
  { lat: 18.5077, lng: 73.8752, type: "Longitudinal Crack", severity: "LOW", area_m2: 3.2, date: "2026-06-24" },
  { lat: 18.5279, lng: 73.8218, type: "Pothole", severity: "CRITICAL", area_m2: 3.5, date: "2026-06-23" },
  { lat: 18.5385, lng: 73.8531, type: "Surface Damage", severity: "LOW", area_m2: 1.2, date: "2026-06-22" },
  { lat: 18.5102, lng: 73.8398, type: "Alligator Crack", severity: "HIGH", area_m2: 5.0, date: "2026-06-21" },
  { lat: 18.5489, lng: 73.8625, type: "Pothole", severity: "MODERATE", area_m2: 1.5, date: "2026-06-20" },
  { lat: 18.5199, lng: 73.8781, type: "Transverse Crack", severity: "HIGH", area_m2: 2.1, date: "2026-06-19" },
];

const severityColor = (sev: string): string => {
  switch (sev) {
    case "CRITICAL": return "#EF4444";
    case "HIGH": return "#F59E0B";
    case "MODERATE": return "#19F5FF";
    case "LOW": return "#00D4FF";
    default: return "#AAB3C5";
  }
};

const severityRadius = (sev: string): number => {
  switch (sev) {
    case "CRITICAL": return 14;
    case "HIGH": return 11;
    case "MODERATE": return 8;
    case "LOW": return 5;
    default: return 6;
  }
};

export default function RoadHealthMap() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="aspect-video bg-[rgba(0,0,0,0.3)] rounded-xl flex items-center justify-center">
        <p className="text-[#AAB3C5] text-sm">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[rgba(0,212,255,0.15)]">
      <MapContainer
        center={[18.525, 73.85]}
        zoom={13}
        className="aspect-video w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {hazardData.map((p, i) => (
          <CircleMarker
            key={i}
            center={[p.lat, p.lng]}
            radius={severityRadius(p.severity)}
            pathOptions={{
              color: severityColor(p.severity),
              fillColor: severityColor(p.severity),
              fillOpacity: 0.5,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <span style={{ color: severityColor(p.severity), fontWeight: 700 }}>{p.severity}</span>
            </Tooltip>
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, minWidth: 180 }}>
                <strong style={{ color: severityColor(p.severity), fontSize: 15 }}>{p.type}</strong>
                <br />Severity: <span style={{ color: severityColor(p.severity), fontWeight: 700 }}>{p.severity}</span>
                <br />Area: <strong>{p.area_m2.toFixed(1)} m²</strong>
                <br />Detected: {p.date}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
