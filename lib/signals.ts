import { getAllParcels, getRedis, KEYS, saveParcel, saveSignal } from "./redis";
import { findParcelAt } from "./geo";
import { applyTransition } from "./parcels";
import type { PublicSignal, Signal } from "./types";

/** Убирает chatId жителя перед отдачей в панель. */
export function toPublicSignal(s: Signal): PublicSignal {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { chatId, ...rest } = s;
  return rest;
}

export function formatSignalId(n: number): string {
  return `S-${String(n).padStart(4, "0")}`;
}

/**
 * Сохраняет сигнал жителя (status: new), привязывает к участку по точке.
 * Участок в статусе clean/resolved переводится в check.
 */
export async function createSignalFromBot(input: {
  chatId: number;
  lat: number;
  lng: number;
  text: string;
  photoFileId: string;
}): Promise<Signal> {
  const [seq, parcels] = await Promise.all([getRedis().incr(KEYS.signalSeq), getAllParcels()]);
  const id = formatSignalId(seq);
  const parcel = findParcelAt(input.lat, input.lng, parcels);

  const signal: Signal = {
    id,
    chatId: input.chatId,
    lat: input.lat,
    lng: input.lng,
    text: input.text,
    photoFileId: input.photoFileId,
    status: "new",
    createdAt: new Date().toISOString(),
    ...(parcel ? { parcelId: parcel.id } : {}),
  };
  await saveSignal(signal);

  if (parcel) {
    const action = `Поступил сигнал ${id} от жителя`;
    if (parcel.status === "clean" || parcel.status === "resolved") {
      const res = applyTransition(parcel, { to: "check" }, action);
      if ("parcel" in res) await saveParcel(res.parcel);
    } else {
      await saveParcel({ ...parcel, history: [...parcel.history, { at: signal.createdAt, action }] });
    }
  }
  return signal;
}
