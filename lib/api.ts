// Клиентские вызовы API панели. Ошибки — Error с текстом из {error}.
import type { Application, ApplicationStage, Parcel, PublicSignal, SignalStatus, StateResponse, ViolationType } from "./types";
import type { ParcelTransitionInput } from "./parcels";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new Error("Нет связи с сервером");
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(data?.error ?? `Ошибка ${res.status}`);
  if (!data) throw new Error("Пустой ответ сервера");
  return data;
}

export const fetchState = () => request<StateResponse>("/api/state");

export const patchParcel = (id: string, body: ParcelTransitionInput) =>
  request<{ parcel: Parcel }>(`/api/parcels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export function uploadParcelPhoto(id: string, file: Blob) {
  const form = new FormData();
  form.append("file", file, "photo.jpg");
  return request<{ parcel: Parcel; url: string }>(`/api/parcels/${encodeURIComponent(id)}/photos`, {
    method: "POST",
    body: form,
  });
}

export interface SignalPatch {
  to: SignalStatus;
  note?: string;
  violation?: { violationType: ViolationType; deadline: string; comment?: string };
}

export const patchSignal = (id: string, body: SignalPatch) =>
  request<{ signal: PublicSignal; parcel: Parcel | null }>(`/api/signals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Изменение контрольного срока без смены статуса. */
export const patchParcelDeadline = (id: string, deadline: string) =>
  request<{ parcel: Parcel }>(`/api/parcels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deadline }),
  });

export const patchApp = (track: string, body: { stage: ApplicationStage; stageNote: string }) =>
  request<{ app: Application; notified: number }>(`/api/apps/${encodeURIComponent(track)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
