import { KNOWLEDGE, localizeEntry, type KnowledgeLang } from "@/content/knowledge";
import type { ApplicationStage, ParcelStatus, SignalStatus, ViolationType } from "./types";

export const PARCEL_STATUSES: ParcelStatus[] = [
  "clean",
  "check",
  "detected",
  "in_progress",
  "resolved",
  "returned",
];

export interface ParcelStatusStyle {
  color: string;
  label: string;
  badge?: string;
  dashArray?: string;
}

export const PARCEL_STATUS_STYLE: Record<ParcelStatus, ParcelStatusStyle> = {
  clean: { color: "#16a34a", label: "Нарушений нет" },
  check: { color: "#eab308", label: "На проверке" },
  detected: { color: "#dc2626", label: "Нарушение выявлено" },
  in_progress: { color: "#dc2626", label: "Устраняется", badge: "устраняется", dashArray: "8 4 2 4" },
  resolved: { color: "#16a34a", label: "Устранено", badge: "устранено" },
  returned: { color: "#64748b", label: "Возвращено государству" },
};

export const VIOLATION_LABEL: Record<ViolationType, string> = {
  unused: "Неиспользование",
  seizure: "Самозахват",
  dump: "Свалка",
};

export interface Transition {
  to: ParcelStatus;
  action: string; // подпись кнопки
  historyText: string; // запись в историю
}

export const PARCEL_TRANSITIONS: Record<ParcelStatus, Transition[]> = {
  clean: [{ to: "check", action: "Назначить проверку", historyText: "Назначена проверка" }],
  check: [
    { to: "clean", action: "Сигнал не подтвердился", historyText: "Проверка: нарушение не подтвердилось" },
    { to: "detected", action: "Зафиксировать нарушение", historyText: "Выявлено нарушение" },
  ],
  detected: [
    { to: "in_progress", action: "Нарушитель приступил к устранению", historyText: "Нарушитель приступил к устранению" },
    { to: "returned", action: "Вернуть государству", historyText: "Участок возвращён государству" },
  ],
  in_progress: [
    { to: "resolved", action: "Нарушение устранено", historyText: "Нарушение устранено" },
    { to: "returned", action: "Вернуть государству", historyText: "Участок возвращён государству" },
  ],
  resolved: [{ to: "check", action: "Новая проверка", historyText: "Назначена новая проверка" }],
  returned: [],
};

export function canTransition(from: ParcelStatus, to: ParcelStatus): boolean {
  return PARCEL_TRANSITIONS[from].some((t) => t.to === to);
}

export function findTransition(from: ParcelStatus, to: ParcelStatus): Transition | undefined {
  return PARCEL_TRANSITIONS[from].find((t) => t.to === to);
}

/** Статусы, у которых срок устранения активен (для просрочки). */
export const DEADLINE_STATUSES: ParcelStatus[] = ["detected", "in_progress"];

export function isOverdue(p: { status: ParcelStatus; deadline?: string }, now: number = Date.now()): boolean {
  return !!p.deadline && DEADLINE_STATUSES.includes(p.status) && new Date(p.deadline).getTime() < now;
}

// ---- Сигналы ----

export const SIGNAL_STATUS_STYLE: Record<SignalStatus, { color: string; label: string }> = {
  new: { color: "#f97316", label: "Новый" },
  checking: { color: "#2563eb", label: "В проверке" },
  confirmed: { color: "#dc2626", label: "Нарушение подтверждено" },
  rejected: { color: "#6b7280", label: "Отклонён" },
  resolved: { color: "#16a34a", label: "Устранено" },
};

export const SIGNAL_TRANSITIONS: Record<SignalStatus, SignalStatus[]> = {
  new: ["checking", "confirmed", "rejected"],
  checking: ["confirmed", "rejected"],
  confirmed: ["resolved"],
  rejected: [],
  resolved: [],
};

export function canSignalTransition(from: SignalStatus, to: SignalStatus): boolean {
  return SIGNAL_TRANSITIONS[from].includes(to);
}

// ---- Заявления ----

export const APPLICATION_STAGES: ApplicationStage[] = ["review", "inspection", "approved", "rejected"];

export const APPLICATION_STAGE_COLOR: Record<ApplicationStage, string> = {
  review: "#2563eb",
  inspection: "#ca8a04",
  approved: "#16a34a",
  rejected: "#dc2626",
};

export const APPLICATION_STAGE_LABEL: Record<ApplicationStage, string> = {
  review: "На рассмотрении",
  inspection: "Назначен выезд инспектора",
  approved: "Одобрено",
  rejected: "Отказ",
};

/** Название процедуры — из базы знаний (content/knowledge.ts). */
export function procedureLabel(id: string, lang: KnowledgeLang = "ru"): string {
  const e = KNOWLEDGE.find((k) => k.id === id);
  return e ? localizeEntry(e, lang).title : id;
}
