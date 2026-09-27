"use client";

import "leaflet/dist/leaflet.css";
import { Fragment, useEffect } from "react";
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import { dataBounds, parcelCenter, polygonToLeaflet } from "@/lib/geo";
import { PARCEL_STATUS_STYLE } from "@/lib/status";
import type { PublicParcel } from "@/lib/public-stats";
import type { Parcel } from "@/lib/types";

// Для геоутилит нужен Parcel; публичные данные содержат только геометрию.
const asParcel = (p: PublicParcel) => ({ geometry: p.geometry }) as Parcel;

function Fit({ parcels }: { parcels: PublicParcel[] }) {
  const map = useMap();
  useEffect(() => {
    const b = dataBounds(parcels.map(asParcel));
    if (b) map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
  }, [parcels, map]);
  return null;
}

export default function PublicMap({ parcels }: { parcels: PublicParcel[] }) {
  return (
    <MapContainer center={[42.9, 71.36667]} zoom={12} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Fit parcels={parcels} />
      {parcels.map((p, i) => {
        const st = PARCEL_STATUS_STYLE[p.status];
        const label = `${st.label} · ${p.purpose} · ${p.areaHa.toFixed(4)} га`;
        return (
          <Fragment key={i}>
            <Polygon positions={polygonToLeaflet(p.geometry)} pathOptions={{ color: st.color, fillColor: st.color, fillOpacity: 0.5, weight: 2 }}>
              <Tooltip sticky>{label}</Tooltip>
            </Polygon>
            <CircleMarker center={parcelCenter(asParcel(p))} radius={6} pathOptions={{ color: "#fff", weight: 2, fillColor: st.color, fillOpacity: 1 }}>
              <Tooltip>{label}</Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
