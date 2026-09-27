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

/** Границы всех участков в формате Leaflet [[south, west], [north, east]]. */
export function parcelsBounds(parcels: Parcel[]): [LatLngTuple, LatLngTuple] | null {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const p of parcels) {
    for (const ring of p.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
    }
  }
  if (!Number.isFinite(minLat)) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/** Центр полигона (среднее вершин внешнего кольца) для Leaflet. */
export function parcelCenter(p: Parcel): LatLngTuple {
  const ring = p.geometry.coordinates[0].slice(0, -1);
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lat, lng];
}

/** Участок, внутри которого лежит точка (lat/lng от Telegram). */
export function findParcelAt(lat: number, lng: number, parcels: Parcel[]): Parcel | undefined {
  return parcels.find((p) => booleanPointInPolygon([lng, lat], p.geometry));
}
