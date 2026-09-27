import { findTransition, PARCEL_STATUS_STYLE, VIOLATION_LABEL } from "./status";
import { formatDate } from "./format";
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
