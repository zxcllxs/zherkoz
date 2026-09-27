// Уведомления жителю о смене статуса сигнала — на языке, выбранном в боте.
// Ошибка отправки не ломает вызывающий запрос.
import { getBot } from "@/bot/bot";
import { getLang } from "@/bot/state";
import { TEXTS, type Lang } from "@/bot/texts";
import { formatDate } from "./format";
import type { Parcel, Signal } from "./types";

export function signalStatusMessage(signal: Signal, parcel: Parcel | null, lang: Lang = "ru"): string | null {
  const n = TEXTS[lang].notify;
  const id = signal.id;
  switch (signal.status) {
    case "checking":
      return n.checking(id);
    case "confirmed":
      return parcel?.deadline && (parcel.status === "detected" || parcel.status === "in_progress")
        ? n.confirmedWithDeadline(id, formatDate(parcel.deadline))
        : n.confirmed(id);
    case "rejected":
      return n.rejected(id, signal.inspectorNote ?? n.noReason);
    case "resolved":
      return n.resolved(id);
    default:
      return null;
  }
}

export async function notifySignalStatus(signal: Signal, parcel: Parcel | null): Promise<void> {
  if (!signal.chatId) return; // seed-сигналы (chatId 0) — пропускаем
  try {
    const lang = (await getLang(signal.chatId)) ?? "ru";
    const text = signalStatusMessage(signal, parcel, lang);
    if (!text) return;
    await getBot().api.sendMessage(signal.chatId, text);
  } catch (e) {
    console.error(`[notify] ${signal.id}:`, e instanceof Error ? e.message : e);
  }
}
