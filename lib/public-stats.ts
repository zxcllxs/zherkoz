// Открытая статистика для /public: только агрегаты и геометрия, без личных данных.
import type { Parcel, ParcelStatus, PolygonGeometry, Signal } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const SIGNAL_START = /^Поступил сигнал/;
const RESOLVED_MARK = /^(Нарушение устранено|Сигнал S-\d+: нарушение устранено)/;

export interface PublicParcel {
  status: Extract<ParcelStatus, "resolved" | "returned">;
  purpose: string;
  areaHa: number;
  geometry: PolygonGeometry;
}

export interface PublicStats {
  totalSignals: number;
  confirmedSignals: number; // подтверждено (включая уже устранённые)
  resolvedSignals: number;
  avgDaysToResolve: number | null;
  avgSamples: number;
  parcels: PublicParcel[];
  updatedAt: string;
}

/**
 * Время «сигнал → устранение» по истории участков: от записи «Поступил сигнал…»
 * до ближайшей следующей отметки «Нарушение устранено» / «Сигнал S-…: нарушение устранено».
 */
export function resolutionDurationsDays(parcels: Parcel[]): number[] {
  const out: number[] = [];
  for (const p of parcels) {
    let start: number | null = null;
    for (const h of p.history) {
      const at = Date.parse(h.at);
      if (Number.isNaN(at)) continue;
      if (start === null && SIGNAL_START.test(h.action)) start = at;
      else if (start !== null && RESOLVED_MARK.test(h.action)) {
        if (at >= start) out.push((at - start) / DAY_MS);
        start = null;
      }
    }
  }
  return out;
}

export function computePublicStats(parcels: Parcel[], signals: Signal[], now: number = Date.now()): PublicStats {
  const durations = resolutionDurationsDays(parcels);
  return {
    totalSignals: signals.length,
    confirmedSignals: signals.filter((s) => s.status === "confirmed" || s.status === "resolved").length,
    resolvedSignals: signals.filter((s) => s.status === "resolved").length,
    avgDaysToResolve: durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : null,
    avgSamples: durations.length,
    parcels: parcels
      .filter((p): p is Parcel & { status: "resolved" | "returned" } => p.status === "resolved" || p.status === "returned")
      .map((p) => ({ status: p.status, purpose: p.purpose, areaHa: p.areaHa, geometry: p.geometry })),
    updatedAt: new Date(now).toISOString(),
  };
}
