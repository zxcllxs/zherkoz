import { DEADLINE_STATUSES, findTransition, PARCEL_STATUS_STYLE, VIOLATION_LABEL } from "./status";
import { formatDate, isoToDateInput } from "./format";
import type { Parcel, ParcelStatus, ViolationType } from "./types";

export interface ParcelTransitionInput {
  to: ParcelStatus;
  violationType?: ViolationType;
  deadline?: string;
  comment?: string;
}

/** Проверяет переход по lib/status.ts и возвращает обновлённый участок с записью в истории. */
export function applyTransition(
  parcel: Parcel,
  body: ParcelTransitionInput,
  extraAction?: string,
): { parcel: Parcel } | { error: string; status: number } {
  const t = findTransition(parcel.status, body.to);
  if (!t) {
    const from = PARCEL_STATUS_STYLE[parcel.status].label;
    const to = PARCEL_STATUS_STYLE[body.to].label;
    return { error: `Переход «${from}» → «${to}» не разрешён`, status: 409 };
  }

  const next: Parcel = { ...parcel, status: body.to, history: [...parcel.history] };
  let action = extraAction ?? t.historyText;

  if (body.to === "detected") {
    if (!body.violationType) return { error: "Укажите тип нарушения", status: 400 };
    if (!body.deadline) return { error: "Укажите контрольный срок", status: 400 };
    next.violationType = body.violationType;
    next.deadline = new Date(body.deadline).toISOString();
    action += `: ${VIOLATION_LABEL[body.violationType]}, срок до ${formatDate(next.deadline)}`;
  } else if (body.to === "clean" || body.to === "check") {
    delete next.violationType;
    delete next.deadline;
  }

  next.history.push({
    at: new Date().toISOString(),
    action,
    ...(body.comment ? { comment: body.comment } : {}),
  });
  return { parcel: next };
}

/**
 * Изменение контрольного срока без смены статуса (только «Нарушение выявлено» / «Устраняется»).
 * Срок — не раньше сегодняшнего дня по времени Тараза и отличается от текущего.
 */
export function changeDeadline(
  parcel: Parcel,
  deadline: string,
  now: number = Date.now(),
): { parcel: Parcel } | { error: string; status: number } {
  if (!DEADLINE_STATUSES.includes(parcel.status)) {
    const label = PARCEL_STATUS_STYLE[parcel.status].label;
    return { error: `Срок можно изменить только при нарушении; сейчас статус «${label}»`, status: 409 };
  }
  const ms = Date.parse(deadline);
  if (Number.isNaN(ms)) return { error: "Некорректная дата", status: 400 };
  const iso = new Date(ms).toISOString();
  if (isoToDateInput(iso) < isoToDateInput(new Date(now).toISOString())) {
    return { error: "Контрольный срок не может быть в прошлом", status: 400 };
  }
  if (parcel.deadline && isoToDateInput(parcel.deadline) === isoToDateInput(iso)) {
    return { error: "Срок не изменился", status: 400 };
  }
  return {
    parcel: {
      ...parcel,
      deadline: iso,
      history: [...parcel.history, { at: new Date(now).toISOString(), action: `Контрольный срок изменён: до ${formatDate(iso)}` }],
    },
  };
}

/** URL фото из Telegram (через серверный прокси — токен бота не уходит на клиент). */
export function tgPhotoUrl(fileId: string): string {
  return `/api/tg-photo/${encodeURIComponent(fileId)}`;
}

/** Добавляет фото жителя из сигнала в участок (без дублей) с записью в истории. */
export function addResidentPhoto(parcel: Parcel, signalId: string, fileId: string, now: number = Date.now()): Parcel {
  const url = tgPhotoUrl(fileId);
  if (parcel.photos.includes(url)) return parcel;
  return {
    ...parcel,
    photos: [...parcel.photos, url],
    history: [...parcel.history, { at: new Date(now).toISOString(), action: `Добавлено фото жителя (сигнал ${signalId})` }],
  };
}
