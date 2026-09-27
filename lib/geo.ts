// ЕДИНСТВЕННОЕ место, где порядок координат переставляется:
// данные/API — GeoJSON [lng, lat], Leaflet — [lat, lng].
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Parcel, PolygonGeometry } from "./types";

export type LatLngTuple = [number, number]; // [lat, lng] — только для Leaflet

export function toLeaflet([lng, lat]: [number, number]): LatLngTuple {
  return [lat, lng];
}

export function polygonToLeaflet(geometry: PolygonGeometry): LatLngTuple[][] {
  return geometry.coordinates.map((ring) => ring.map(toLeaflet));
}

/** Сигнал хранит lat/lng раздельно — точка для Leaflet. */
export function signalToLeaflet(s: { lat: number; lng: number }): LatLngTuple {
  return [s.lat, s.lng];
}

/** Границы всех участков и сигналов в формате Leaflet [[south, west], [north, east]]. */
export function dataBounds(
  parcels: Parcel[],
  signals: { lat: number; lng: number }[] = [],
): [LatLngTuple, LatLngTuple] | null {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  const add = (lat: number, lng: number) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };
  for (const p of parcels) for (const ring of p.geometry.coordinates) for (const [lng, lat] of ring) add(lat, lng);
  for (const s of signals) add(s.lat, s.lng);
  if (!Number.isFinite(minLat)) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Центроид внешнего кольца полигона (по площади, формула шнурования) для Leaflet.
 * Для участков в пределах города плоское приближение в градусах достаточно точное.
 */
export function parcelCenter(p: Parcel): LatLngTuple {
  const ring = p.geometry.coordinates[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(a) < 1e-14) {
    // Вырожденный полигон — среднее вершин.
    const pts = ring.slice(0, -1);
    return [pts.reduce((s, c) => s + c[1], 0) / pts.length, pts.reduce((s, c) => s + c[0], 0) / pts.length];
  }
  return [cy / (3 * a), cx / (3 * a)];
}

/** Участок, внутри которого лежит точка (lat/lng от Telegram). */
export function findParcelAt(lat: number, lng: number, parcels: Parcel[]): Parcel | undefined {
  return parcels.find((p) => booleanPointInPolygon([lng, lat], p.geometry));
}
