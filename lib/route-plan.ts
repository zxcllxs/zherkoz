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
const TWO_OPT_MAX_ITER = 200;
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
  urgent: boolean; // приоритет ≥ 3
  reasons: string[];
}

export interface PlannedStop extends Stop {
  n: number; // порядковый номер 1..N
  legKm: number; // от предыдущей точки
}

export interface RouteVariant {
  stops: PlannedStop[];
  totalKm: number;
  links: string[];
}

/** Оба варианта считаются сразу: единый маршрут и «сначала срочные» — чтобы сравнить длину. */
export interface RoutePlan {
  start: LatLng;
  startLabel: string;
  mixed: RouteVariant;
  urgentFirst: RouteVariant;
}

/** Что рисовать на карте: старт и точки выбранного варианта. */
export interface RouteView {
  start: LatLng;
  startLabel: string;
  stops: PlannedStop[];
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
      urgent: priority >= HIGH_PRIORITY,
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
      urgent: priority >= HIGH_PRIORITY,
      reasons: reasonStatus ? [reasonStatus, ...reasons] : reasons,
    });
  }
  return stops;
}

/** Ближайший сосед от from; при равном расстоянии — выше приоритет. */
function nearestNeighbor(from: LatLng, stops: Stop[]): Stop[] {
  const left = [...stops];
  const out: Stop[] = [];
  let cur = from;
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
    out.push(next);
    cur = next;
  }
  return out;
}

/**
 * 2-opt для открытого пути с фиксированным началом (конец свободный):
 * разворот отрезка [i..k], если он укорачивает путь. Итерация — одно принятое улучшение, максимум 200.
 */
export function twoOpt(from: LatLng, route: Stop[], maxIter: number = TWO_OPT_MAX_ITER): Stop[] {
  const r = [...route];
  const n = r.length;
  if (n < 3) return r;
  const d = haversineKm;
  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false;
    for (let i = 0; i < n - 1 && !improved; i++) {
      const prev = i === 0 ? from : r[i - 1];
      for (let k = i + 1; k < n; k++) {
        const next = k === n - 1 ? null : r[k + 1];
        const before = d(prev, r[i]) + (next ? d(r[k], next) : 0);
        const after = d(prev, r[k]) + (next ? d(r[i], next) : 0);
        if (after < before - 1e-9) {
          const seg = r.slice(i, k + 1).reverse();
          r.splice(i, k - i + 1, ...seg);
          improved = true;
          break;
        }
      }
    }
    if (!improved) break;
  }
  return r;
}

function toPlanned(from: LatLng, route: Stop[]): PlannedStop[] {
  let cur = from;
  return route.map((s, i) => {
    const legKm = haversineKm(cur, s);
    cur = s;
    return { ...s, n: i + 1, legKm };
  });
}

/**
 * Порядок обхода. По умолчанию — единый маршрут по всем точкам (ближайший сосед + 2-opt).
 * urgentFirst: сначала точки с приоритетом ≥3, затем остальные; внутри каждого уровня — тоже 2-opt.
 */
export function orderStops(start: LatLng, stops: Stop[], urgentFirst = false): PlannedStop[] {
  if (!urgentFirst) return toPlanned(start, twoOpt(start, nearestNeighbor(start, stops)));
  const urgent = twoOpt(start, nearestNeighbor(start, stops.filter((s) => s.urgent)));
  const tail = urgent.length ? urgent[urgent.length - 1] : start;
  const rest = twoOpt(tail, nearestNeighbor(tail, stops.filter((s) => !s.urgent)));
  return toPlanned(start, [...urgent, ...rest]);
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

function variant(start: LatLng, stops: Stop[], urgentFirst: boolean): RouteVariant {
  const ordered = orderStops(start, stops, urgentFirst);
  return {
    stops: ordered,
    totalKm: ordered.reduce((sum, s) => sum + s.legKm, 0),
    links: googleMapsLinks(start, ordered),
  };
}

export function buildRoutePlan(
  parcels: Parcel[],
  signals: PublicSignal[],
  now: number,
  start: LatLng,
  startLabel: string,
): RoutePlan {
  const stops = collectStops(parcels, signals, now);
  return { start, startLabel, mixed: variant(start, stops, false), urgentFirst: variant(start, stops, true) };
}
