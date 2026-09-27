// План выезда инспектора: отбор точек, приоритет, порядок обхода, ссылки Google Maps.
import { parcelCenter, haversineKm } from "./geo";
import { isOverdue } from "./status";
import { signalReports } from "./signal-utils";
import type { Parcel, PublicSignal } from "./types";

export const TARAZ_CENTER = { lat: 42.9, lng: 71.36667 };
const DAY_MS = 24 * 60 * 60 * 1000;
const SOON_DAYS = 3;
const HIGH_PRIORITY = 3;
const MAX_WAYPOINTS = 9;
const MAX_URL = 2048;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Stop extends LatLng {
  kind: "signal" | "parcel";
  id: string;
  title: string;
  priority: number;
  reasons: string[];
}

export interface PlannedStop extends Stop {
  n: number; // порядковый номер 1..N
  legKm: number; // от предыдущей точки
}

export interface RoutePlan {
  start: LatLng;
  startLabel: string;
  stops: PlannedStop[];
  totalKm: number;
  links: string[];
}

function isDeadlineSoon(p: Parcel, now: number): boolean {
  return (
    !!p.deadline &&
    (p.status === "detected" || p.status === "in_progress") &&
    new Date(p.deadline).getTime() - now <= SOON_DAYS * DAY_MS
  );
}

/**
 * Приоритет = (просрочка ? 3 : 0) + (новый сигнал ? 2 : 0) + reports + (свалка ? 1 : 0).
 * Для сигнала просрочка и тип нарушения берутся из привязанного участка; reports у участка — 0.
 */
export function stopPriority(
  signal: PublicSignal | null,
  parcel: Parcel | null,
  now: number,
): { priority: number; reasons: string[] } {
  const reasons: string[] = [];
  let priority = 0;
  if (parcel && isOverdue(parcel, now)) {
    priority += 3;
    reasons.push("срок просрочен");
  }
  if (signal?.status === "new") {
    priority += 2;
    reasons.push("новый сигнал");
  }
  if (signal) {
    const reports = signalReports(signal);
    priority += reports;
    reasons.push(reports > 1 ? `сообщили ${reports} жителей` : "1 сообщение");
  }
  if (parcel?.violationType === "dump") {
    priority += 1;
    reasons.push("свалка");
  }
  return { priority, reasons };
}

/** Приоритет сигнала — для сортировки списка сигналов в панели. */
export function signalPriority(s: PublicSignal, parcels: Parcel[], now: number): number {
  const parcel = s.parcelId ? (parcels.find((p) => p.id === s.parcelId) ?? null) : null;
  return stopPriority(s, parcel, now).priority;
}

/** Точки выезда: сигналы new/checking; участки check и detected/in_progress с просроченным или истекающим (≤3 дн.) сроком. */
export function collectStops(parcels: Parcel[], signals: PublicSignal[], now: number): Stop[] {
  const byId = new Map(parcels.map((p) => [p.id, p]));
  const stops: Stop[] = [];
  const coveredParcels = new Set<string>();

  for (const s of signals) {
    if (s.status !== "new" && s.status !== "checking") continue;
    const parcel = s.parcelId ? (byId.get(s.parcelId) ?? null) : null;
    if (parcel) coveredParcels.add(parcel.id);
    const { priority, reasons } = stopPriority(s, parcel, now);
    stops.push({
      kind: "signal",
      id: s.id,
      title: `Сигнал ${s.id}${parcel ? ` · ${parcel.cadastralNumber}` : ""}`,
      lat: s.lat,
      lng: s.lng,
      priority,
      reasons,
    });
  }

  for (const p of parcels) {
    // Участок, к которому уже едем по сигналу, отдельной точкой не добавляем.
    if (coveredParcels.has(p.id)) continue;
    const overdue = isOverdue(p, now);
    const reasonStatus =
      p.status === "check" ? "на проверке" : overdue ? null : isDeadlineSoon(p, now) ? "срок истекает ≤3 дн." : undefined;
    if (reasonStatus === undefined) continue;
    const { priority, reasons } = stopPriority(null, p, now);
    const [lat, lng] = parcelCenter(p);
    stops.push({
      kind: "parcel",
      id: p.id,
      title: `Участок ${p.cadastralNumber}`,
      lat,
      lng,
      priority,
      reasons: reasonStatus ? [reasonStatus, ...reasons] : reasons,
    });
  }
  return stops;
}

/** Жадный ближайший сосед: сначала точки с приоритетом ≥3, затем остальные; при равном расстоянии — выше приоритет. */
export function orderStops(start: LatLng, stops: Stop[]): PlannedStop[] {
  const tiers = [stops.filter((s) => s.priority >= HIGH_PRIORITY), stops.filter((s) => s.priority < HIGH_PRIORITY)];
  const result: PlannedStop[] = [];
  let cur = start;
  for (const tier of tiers) {
    const left = [...tier];
    while (left.length) {
      let bi = 0;
      let bd = Infinity;
      left.forEach((s, i) => {
        const d = haversineKm(cur, s);
        if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && s.priority > left[bi].priority)) {
          bd = d;
          bi = i;
        }
      });
      const [next] = left.splice(bi, 1);
      result.push({ ...next, n: result.length + 1, legKm: bd });
      cur = next;
    }
  }
  return result;
}

const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

function dirUrl(origin: LatLng, points: LatLng[]): string {
  const destination = points[points.length - 1];
  const waypoints = points.slice(0, -1);
  let url =
    `https://www.google.com/maps/dir/?api=1&origin=${fmt(origin)}&destination=${fmt(destination)}` +
    `&travelmode=driving`;
  if (waypoints.length) url += `&waypoints=${waypoints.map(fmt).join("%7C")}`;
  return url;
}

/** Ссылки Google Maps: не больше 9 промежуточных точек и < 2048 символов; следующий маршрут стартует с конца предыдущего. */
export function googleMapsLinks(start: LatLng, stops: LatLng[]): string[] {
  const links: string[] = [];
  let origin = start;
  let i = 0;
  while (i < stops.length) {
    let size = Math.min(MAX_WAYPOINTS + 1, stops.length - i);
    let url = dirUrl(origin, stops.slice(i, i + size));
    while (url.length >= MAX_URL && size > 1) {
      size--;
      url = dirUrl(origin, stops.slice(i, i + size));
    }
    links.push(url);
    origin = stops[i + size - 1];
    i += size;
  }
  return links;
}

export function buildRoutePlan(
  parcels: Parcel[],
  signals: PublicSignal[],
  now: number,
  start: LatLng,
  startLabel: string,
): RoutePlan {
  const stops = orderStops(start, collectStops(parcels, signals, now));
  return {
    start,
    startLabel,
    stops,
    totalKm: stops.reduce((sum, s) => sum + s.legKm, 0),
    links: googleMapsLinks(start, stops),
  };
}
