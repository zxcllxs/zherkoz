// Чистые хелперы сигналов (без Redis) — используются и на сервере, и в браузере.
import { haversineKm } from "./geo";
import type { Signal, SignalSource } from "./types";

/** Радиус, в котором новый сигнал считается дублем активного (new/checking). */
export const DUPLICATE_RADIUS_M = 50;

// Дефолты для старых сигналов (seed и созданные до объединения дублей).
export const signalSource = (s: { source?: SignalSource }): SignalSource => s.source ?? "citizen";

export const SOURCE_LABEL: Record<SignalSource, string> = { citizen: "житель", satellite: "спутник" };

export const signalReports = (s: { reports?: number }) => s.reports ?? 1;

export function signalPhotoIds(s: { photoFileId?: string; photoFileIds?: string[] }): string[] {
  return s.photoFileIds ?? (s.photoFileId ? [s.photoFileId] : []);
}

/** Все жители, которых уведомляем о сигнале: автор + присоединившиеся (без 0 и повторов). */
export function signalRecipients(s: Signal): number[] {
  return [...new Set([s.chatId, ...(s.subscribers ?? [])])].filter((id) => Number.isSafeInteger(id) && id !== 0);
}

/** Ближайший активный сигнал (new/checking) в радиусе DUPLICATE_RADIUS_M. */
export function findDuplicate(signals: Signal[], lat: number, lng: number): Signal | undefined {
  let best: Signal | undefined;
  let bestM = Infinity;
  for (const s of signals) {
    if (s.status !== "new" && s.status !== "checking") continue;
    const m = haversineKm(s, { lat, lng }) * 1000;
    if (m <= DUPLICATE_RADIUS_M && m < bestM) {
      best = s;
      bestM = m;
    }
  }
  return best;
}
