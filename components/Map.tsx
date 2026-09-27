"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { useEffect, useState } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { PathOptions } from "leaflet";
import { parcelsBounds, polygonToLeaflet } from "@/lib/geo";
import { PARCEL_STATUS_STYLE } from "@/lib/status";
import type { Parcel } from "@/lib/types";
import Legend from "./Legend";

export interface MapProps {
  parcels: Parcel[];
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
}

function FitBoundsOnce({ parcels }: { parcels: Parcel[] }) {
  const map = useMap();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done || parcels.length === 0) return;
    const b = parcelsBounds(parcels);
    if (b) map.fitBounds(b, { padding: [30, 30] });
    setDone(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, [done, parcels, map]);
  return null;
}

function parcelStyle(p: Parcel, hovered: boolean, selected: boolean): PathOptions {
  const st = PARCEL_STATUS_STYLE[p.status];
  return {
    color: selected ? "#1e3a8a" : st.color,
    weight: selected ? 4 : hovered ? 3 : 2,
    fillColor: st.color,
    fillOpacity: hovered || selected ? 0.65 : 0.45,
    dashArray: st.dashArray,
  };
}

export default function ParcelMap({ parcels, selectedParcelId, onSelectParcel }: MapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[42.9, 71.36667]} zoom={13} className="h-full w-full" preferCanvas={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitBoundsOnce parcels={parcels} />
        {parcels.map((p) => (
          <Polygon
            key={p.id}
            positions={polygonToLeaflet(p.geometry)}
            pathOptions={parcelStyle(p, hovered === p.id, selectedParcelId === p.id)}
            eventHandlers={{
              mouseover: () => setHovered(p.id),
              mouseout: () => setHovered((h) => (h === p.id ? null : h)),
              click: () => onSelectParcel(p.id),
            }}
          >
            <Tooltip sticky>
              {p.cadastralNumber} · {PARCEL_STATUS_STYLE[p.status].label}
            </Tooltip>
          </Polygon>
        ))}
      </MapContainer>
      <Legend />
    </div>
  );
}
