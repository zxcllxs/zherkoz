"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { useCallback, useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, Pane, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
import type { PathOptions } from "leaflet";
import { dataBounds, parcelCenter, polygonToLeaflet, signalToLeaflet, type LatLngTuple } from "@/lib/geo";
import { PARCEL_STATUS_STYLE, SIGNAL_STATUS_STYLE, isOverdue } from "@/lib/status";
import type { Parcel, PublicSignal } from "@/lib/types";
import Legend from "./Legend";
import BasemapSwitch, { type Basemap } from "./BasemapSwitch";
import { S2_LATEST_YEAR, S2_MAX_NATIVE_ZOOM, s2AttributionHtml, s2TileUrl } from "@/lib/satellite";
import type { RouteView } from "@/lib/route-plan";
import { signalSource } from "@/lib/signal-utils";

const BASEMAP_KEY = "zherkoz:basemap";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
  route: RouteView | null;
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

/** Пересчёт размера карты при изменении контейнера (мобильная шапка/панель, поворот экрана). */
function SizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/** Новый план выезда — показать весь маршрут. */
function FitRoute({ route }: { route: RouteView | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route || route.stops.length === 0) return;
    const pts = [route.start, ...route.stops].map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }, [route, map]);
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

/** Маркер сигнала по спутниковым снимкам: 🛰 в круге цвета статуса. */
function satelliteIcon(color: string, selected: boolean) {
  return divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:#fff;border:3px solid ${selected ? "#1e3a8a" : color};font-size:16px;line-height:24px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">🛰</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** Нумерованный маркер точки маршрута (HTML-иконка, без картинок). */
function routeIcon(label: string, color: string) {
  return divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${color};color:#fff;font:700 13px/28px system-ui,sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function ParcelMap(props: MapProps) {
  const { parcels, signals, selectedParcelId, selectedSignalId, focus, now, route, onSelectParcel, onSelectSignal } = props;
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(13);
  const [basemap, setBasemap] = useState<Basemap>("osm");
  const chooseBasemap = useCallback((b: Basemap) => {
    try {
      localStorage.setItem(BASEMAP_KEY, b);
    } catch {
      // хранилище недоступно — выбор просто не запомнится
    }
    setBasemap(b);
  }, []);

  // Восстановить выбранную подложку (асинхронно, после монтирования).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(BASEMAP_KEY);
    } catch {}
    if (saved !== "sat") return;
    const t = setTimeout(() => setBasemap("sat"), 0);
    return () => clearTimeout(t);
  }, []);
  const showMarkers = zoom < MARKER_MAX_ZOOM;

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[42.9, 71.36667]} zoom={13} className="h-full w-full">
        {basemap === "sat" ? (
          <TileLayer
            key="sat"
            attribution={s2AttributionHtml(String(S2_LATEST_YEAR))}
            url={s2TileUrl(S2_LATEST_YEAR)}
            maxNativeZoom={S2_MAX_NATIVE_ZOOM}
            maxZoom={19}
          />
        ) : (
          <TileLayer key="osm" attribution={OSM_ATTRIBUTION} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        )}
        <FitBoundsOnce parcels={parcels} signals={signals} />
        <FlyTo focus={focus} />
        <ZoomWatcher onZoom={setZoom} />
        <SizeWatcher />
        <FitRoute route={route} />
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
            if (signalSource(s) === "satellite") {
              return (
                <Marker
                  key={`${s.id}-${s.status}-${selected}`}
                  position={signalToLeaflet(s)}
                  icon={satelliteIcon(st.color, selected)}
                  pane="signals"
                  eventHandlers={{ click: () => onSelectSignal(s.id) }}
                >
                  <Tooltip>
                    {s.id} · {st.label} · источник: спутник
                  </Tooltip>
                </Marker>
              );
            }
            return (
              <CircleMarker
                key={`${s.id}-${s.status}`}
                center={signalToLeaflet(s)}
                radius={(s.reports ?? 1) > 1 ? 13 : 9}
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
                  {(s.reports ?? 1) > 1 && ` · сообщили ${s.reports} жителей`}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </Pane>
        {route && route.stops.length > 0 && (
          <Pane name="route" style={{ zIndex: 460 }}>
            <Polyline
              positions={[[route.start.lat, route.start.lng], ...route.stops.map((s) => [s.lat, s.lng] as [number, number])]}
              pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.8, dashArray: "10 8" }}
            />
            <Marker position={[route.start.lat, route.start.lng]} icon={routeIcon("▶", "#0f172a")} pane="route">
              <Tooltip>Старт: {route.startLabel}</Tooltip>
            </Marker>
            {route.stops.map((s) => (
              <Marker
                key={`${s.kind}-${s.id}`}
                position={[s.lat, s.lng]}
                icon={routeIcon(String(s.n), s.urgent ? "#dc2626" : "#1d4ed8")}
                pane="route"
                eventHandlers={{ click: () => (s.kind === "signal" ? onSelectSignal(s.id) : onSelectParcel(s.id)) }}
              >
                <Tooltip>
                  {s.n}. {s.title} · приоритет {s.priority}
                  {s.urgent && " · срочно"}
                </Tooltip>
              </Marker>
            ))}
          </Pane>
        )}
      </MapContainer>
      <Legend />
      <BasemapSwitch value={basemap} onChange={chooseBasemap} />
    </div>
  );
}
