// Уведомления жителю о смене статуса сигнала — на языке, выбранном в боте.
// Ошибка отправки не ломает вызывающий запрос.
import { getBot } from "@/bot/bot";
import { getLang } from "@/bot/state";
import { TEXTS, type Lang } from "@/bot/texts";
import { formatDate } from "./format";
import { getRedis, KEYS } from "./redis";
import { signalRecipients } from "./signal-utils";
import type { Application, Parcel, Signal } from "./types";

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

/** Уведомление всем жителям сигнала (автор + присоединившиеся), каждому на его языке. seed-сигналы (chatId 0) пропускаются. */
export async function notifySignalStatus(signal: Signal, parcel: Parcel | null): Promise<void> {
  const results = await Promise.allSettled(
    signalRecipients(signal).map(async (chatId) => {
      const text = signalStatusMessage(signal, parcel, (await getLang(chatId)) ?? "ru");
      if (text) await getBot().api.sendMessage(chatId, text);
    }),
  );
  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`[notify] ${signal.id}:`, r.reason instanceof Error ? r.reason.message : r.reason);
    }
  }
}

/**
 * Смена этапа заявления → сообщение всем подписчикам трек-номера (bot:sub:{track}) на их языке.
 * Ошибки отправки только логируются. Возвращает число успешно отправленных сообщений.
 */
export async function notifyApplicationStage(app: Application): Promise<number> {
  try {
    const ids = await getRedis().smembers(KEYS.botSub(app.trackNumber));
    const results = await Promise.allSettled(
      ids.map(async (raw) => {
        const chatId = Number(raw);
        if (!Number.isSafeInteger(chatId) || chatId === 0) return;
        const t = TEXTS[(await getLang(chatId)) ?? "ru"];
        await getBot().api.sendMessage(chatId, t.appChanged(app.trackNumber, t.stageLabel[app.stage], app.stageNote));
      }),
    );
    results.forEach((r) => {
      if (r.status === "rejected") {
        console.error(`[notify] ${app.trackNumber}:`, r.reason instanceof Error ? r.reason.message : r.reason);
      }
    });
    return results.filter((r) => r.status === "fulfilled").length;
  } catch (e) {
    console.error(`[notify] ${app.trackNumber}:`, e instanceof Error ? e.message : e);
    return 0;
  }
}
