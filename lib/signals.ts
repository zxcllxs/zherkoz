import { getAllParcels, getAllSignals, getRedis, KEYS, saveParcel, saveSignal } from "./redis";
import { findParcelAt } from "./geo";
import { findDuplicate, signalPhotoIds, signalRecipients, signalReports } from "./signal-utils";
import { applyTransition } from "./parcels";
import type { PublicSignal, Signal } from "./types";

export { signalPhotoIds, signalRecipients, signalReports } from "./signal-utils";

/** Убирает chatId жителей (автора и присоединившихся) перед отдачей в панель. */
export function toPublicSignal(s: Signal): PublicSignal {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { chatId, subscribers, ...rest } = s;
  return rest;
}

export function formatSignalId(n: number): string {
  return `S-${String(n).padStart(4, "0")}`;
}

/**
 * Сохраняет сигнал жителя (status: new), привязывает к участку по точке.
 * Участок в статусе clean/resolved переводится в check.
 * Если в радиусе 50 м уже есть активный сигнал — новый не создаётся: житель присоединяется к существующему.
 */
export async function createSignalFromBot(input: {
  chatId: number;
  lat: number;
  lng: number;
  text: string;
  photoFileId: string;
}): Promise<{ signal: Signal; merged: boolean }> {
  const dup = findDuplicate(await getAllSignals(), input.lat, input.lng);
  if (dup) {
    const alreadyIn = signalRecipients(dup).includes(input.chatId);
    const photos = signalPhotoIds(dup);
    const merged: Signal = {
      ...dup,
      // Один и тот же житель не увеличивает счётчик повторно.
      reports: signalReports(dup) + (alreadyIn ? 0 : 1),
      subscribers: alreadyIn ? (dup.subscribers ?? []) : [...(dup.subscribers ?? []), input.chatId],
      photoFileIds: photos.includes(input.photoFileId) ? photos : [...photos, input.photoFileId],
    };
    await saveSignal(merged);
    return { signal: merged, merged: true };
  }

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
    photoFileIds: [input.photoFileId],
    reports: 1,
    subscribers: [],
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
  return { signal, merged: false };
}
