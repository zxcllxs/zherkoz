// Схема участка для печатного акта: проекция контура в локальные метры и масштабная линейка.
// Локальная равнопромежуточная проекция относительно центроида: для участков размером в сотни метров
// искажение пренебрежимо мало.
import type { PolygonGeometry } from "./types";

const R = 6371008.8; // средний радиус Земли, м
const RAD = Math.PI / 180;

export interface Scheme {
  width: number;
  height: number;
  points: string; // для <polygon points>
  scaleBar: { px: number; meters: number };
  extentM: { w: number; h: number };
}

/** Ближайшая «круглая» длина 1/2/5·10^n, не больше target. */
export function niceLength(target: number): number {
  const p = 10 ** Math.floor(Math.log10(target));
  for (const m of [5, 2, 1]) if (m * p <= target) return m * p;
  return p;
}

export function buildScheme(
  geometry: PolygonGeometry,
  center: { lat: number; lng: number },
  width = 420,
  height = 300,
  margin = 36,
): Scheme {
  const ring = geometry.coordinates[0]; // [lng, lat]
  const cos0 = Math.cos(center.lat * RAD);
  const xy = ring.map(([lng, lat]) => [(lng - center.lng) * RAD * R * cos0, (lat - center.lat) * RAD * R] as const);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1e-6), h = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - 2 * margin) / w, (height - 2 * margin) / h); // px на метр, одинаково по осям
  const offX = (width - w * scale) / 2, offY = (height - h * scale) / 2;
  // Север — вверх: y экрана растёт вниз.
  const points = xy.map(([x, y]) => `${(offX + (x - minX) * scale).toFixed(1)},${(offY + (maxY - y) * scale).toFixed(1)}`).join(" ");
  const meters = niceLength((width * 0.3) / scale);
  return { width, height, points, scaleBar: { px: meters * scale, meters }, extentM: { w, h } };
}
