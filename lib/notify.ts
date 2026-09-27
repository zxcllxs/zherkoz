// Уведомления жителю о смене статуса сигнала. Ошибка отправки не ломает вызывающий запрос.
import { getBot } from "@/bot/bot";
import { formatDate } from "./format";
import type { Parcel, Signal, SignalStatus } from "./types";

export function signalStatusMessage(signal: Signal, parcel: Parcel | null): string | null {
  const id = signal.id;
  switch (signal.status as SignalStatus) {
    case "checking":
      return `🔎 Ваш сигнал ${id} взят в проверку инспектором.`;
    case "confirmed":
      return parcel?.deadline && (parcel.status === "detected" || parcel.status === "in_progress")
        ? `⚠️ По сигналу ${id} подтверждено нарушение. Нарушителю установлен срок устранения до ${formatDate(parcel.deadline)}.`
        : `⚠️ По сигналу ${id} подтверждено нарушение.`;
    case "rejected":
      return `Сигнал ${id} не подтвердился. Причина: ${signal.inspectorNote ?? "не указана"}. Спасибо за бдительность!`;
    case "resolved":
      return `✅ Нарушение по сигналу ${id} устранено. Спасибо, что помогаете городу!`;
    default:
      return null;
  }
}

export async function notifySignalStatus(signal: Signal, parcel: Parcel | null): Promise<void> {
  if (!signal.chatId) return; // seed-сигналы (chatId 0) — пропускаем
  const text = signalStatusMessage(signal, parcel);
  if (!text) return;
  try {
    await getBot().api.sendMessage(signal.chatId, text);
  } catch (e) {
    console.error(`[notify] ${signal.id}:`, e instanceof Error ? e.message : e);
  }
}
