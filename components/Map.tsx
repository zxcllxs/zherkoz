"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Pane, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { PathOptions } from "leaflet";
import { dataBounds, parcelCenter, polygonToLeaflet, signalToLeaflet, type LatLngTuple } from "@/lib/geo";
import { PARCEL_STATUS_STYLE, SIGNAL_STATUS_STYLE, isOverdue } from "@/lib/status";
import type { Parcel, PublicSignal } from "@/lib/types";
import Legend from "./Legend";

/** Ниже этого зума полигоны слишком мелкие — дублируем участки маркерами в центроиде. */
const MARKER_MAX_ZOOM = 15;

export interface MapFocus {
  center: LatLngTuple;
  zoom: number;
  key: number; // меняется при каждом новом запросе flyTo
}

export interface MapProps {
  parcels: Parcel[];
  signals: PublicSignal[];
  selectedParcelId: string | null;
  selectedSignalId: string | null;
  focus: MapFocus | null;
  now: number;
  onSelectParcel: (id: string) => void;
  onSelectSignal: (id: string) => void;
}

/** Начальный вид: все участки и сигналы в кадре (один раз, после первой загрузки данных). */
function FitBoundsOnce({ parcels, signals }: { parcels: Parcel[]; signals: PublicSignal[] }) {
  const map = useMap();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done || parcels.length + signals.length === 0) return;
    const b = dataBounds(parcels, signals);
    if (b) map.fitBounds(b, { padding: [40, 40] });
    setDone(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, [done, parcels, signals, map]);
  return null;
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

function FlyTo({ focus }: { focus: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus.center, focus.zoom, { duration: 0.8 });
  }, [focus, map]);
  return null;
}

function parcelStyle(p: Parcel, hovered: boolean, selected: boolean, overdue: boolean): PathOptions {
  const st = PARCEL_STATUS_STYLE[p.status];
  return {
    color: selected ? "#1e3a8a" : overdue ? "#7f1d1d" : st.color,
    weight: selected ? 4 : hovered || overdue ? 3 : 2,
    fillColor: st.color,
    fillOpacity: hovered || selected ? 0.65 : 0.45,
    // Просрочка — пунктир (важнее штрих-пунктира «устраняется»)
    dashArray: overdue ? "5 5" : st.dashArray,
  };
}

export default function ParcelMap(props: MapProps) {
  const { parcels, signals, selectedParcelId, selectedSignalId, focus, now, onSelectParcel, onSelectSignal } = props;
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(13);
  const showMarkers = zoom < MARKER_MAX_ZOOM;

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[42.9, 71.36667]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitBoundsOnce parcels={parcels} signals={signals} />
        <FlyTo focus={focus} />
        <ZoomWatcher onZoom={setZoom} />
        {parcels.map((p) => (
          <Polygon
            key={p.id}
            positions={polygonToLeaflet(p.geometry)}
            pathOptions={parcelStyle(p, hovered === p.id, selectedParcelId === p.id, isOverdue(p, now))}
            eventHandlers={{
              mouseover: () => setHovered(p.id),
              mouseout: () => setHovered((h) => (h === p.id ? null : h)),
              click: () => onSelectParcel(p.id),
            }}
          >
            <Tooltip sticky>
              {p.cadastralNumber} · {PARCEL_STATUS_STYLE[p.status].label}
              {isOverdue(p, now) && " · ⏰ срок просрочен"}
            </Tooltip>
          </Polygon>
        ))}
        {/* На мелком масштабе — маркер в центроиде каждого участка (под сигналами) */}
        {showMarkers && (
          <Pane name="parcel-markers" style={{ zIndex: 420 }}>
            {parcels.map((p) => {
              const overdue = isOverdue(p, now);
              return (
                <CircleMarker
                  key={p.id}
                  center={parcelCenter(p)}
                  radius={7}
                  pathOptions={{
                    ...parcelStyle(p, hovered === p.id, selectedParcelId === p.id, overdue),
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    mouseover: () => setHovered(p.id),
                    mouseout: () => setHovered((h) => (h === p.id ? null : h)),
                    click: () => onSelectParcel(p.id),
                  }}
                >
                  <Tooltip>
                    {p.cadastralNumber} · {PARCEL_STATUS_STYLE[p.status].label}
                    {overdue && " · ⏰ срок просрочен"}
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </Pane>
        )}
        {/* Слой сигналов поверх полигонов и маркеров участков */}
        <Pane name="signals" style={{ zIndex: 450 }}>
          {signals.map((s) => {
            const st = SIGNAL_STATUS_STYLE[s.status];
            const selected = s.id === selectedSignalId;
            return (
              <CircleMarker
                key={`${s.id}-${s.status}`}
                center={signalToLeaflet(s)}
                radius={9}
                // className применяется только при создании слоя (setStyle его не меняет) — поэтому key зависит от статуса
                className={s.status === "new" ? "signal-new" : undefined}
                pathOptions={{
                  color: selected ? "#1e3a8a" : st.color,
                  weight: selected ? 4 : 2,
                  fillColor: st.color,
                  fillOpacity: 0.9,
                }}
                eventHandlers={{ click: () => onSelectSignal(s.id) }}
              >
                <Tooltip>
                  {s.id} · {st.label}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </Pane>
      </MapContainer>
      <Legend />
    </div>
  );
}
