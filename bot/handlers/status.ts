import { getApplication } from "@/lib/redis";
import { formatDateTime } from "@/lib/format";
import { procedureLabel } from "@/lib/status";
import type { Application } from "@/lib/types";
import { tx, type BotContext } from "../context";
import { askTrackKeyboard, notFoundKeyboard } from "../keyboards";
import { clearState, setState, subscribeToApp } from "../state";
import { escapeHtml, type Lang, type Texts } from "../texts";

const TRACK_RE = /^KZ-\d{4}-\d{3}$/;
export const EXAMPLE_TRACK = "KZ-2026-042";

export function normalizeTrack(input: string): string {
  return input.trim().toUpperCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, "");
}

export function formatApplication(t: Texts, lang: Lang, app: Application): string {
  const lines = [
    `<b>${t.appTitle} ${escapeHtml(app.trackNumber)}</b>`,
    `${t.appProcedure}: ${escapeHtml(procedureLabel(app.procedure, lang))}`,
    t.pipeline[app.stage],
  ];
  if (app.stage === "rejected") {
    lines.push(`❌ <b>${t.appNote}:</b> ${escapeHtml(app.stageNote || t.appNoReason)}`);
  } else if (app.stageNote) {
    lines.push(`${t.appNote}: ${escapeHtml(app.stageNote)}`);
  }
  lines.push(`${t.appUpdated}: ${formatDateTime(app.updatedAt)}`);
  // Пояснения к заявлениям в реестре — только на русском.
  if (t.dataInRussian) lines.push("", `<i>${t.dataInRussian}</i>`);
  return lines.join("\n");
}

export async function askTrack(ctx: BotContext) {
  const t = tx(ctx);
  await setState(ctx.chat!.id, { step: "await_track" });
  await ctx.reply(t.askTrack, { parse_mode: "HTML", reply_markup: askTrackKeyboard(t) });
}

export async function showExample(ctx: BotContext) {
  const t = tx(ctx);
  const app = await getApplication(EXAMPLE_TRACK);
  if (!app) return ctx.reply(t.askTrack, { parse_mode: "HTML" });
  await ctx.reply(`${t.exampleHeader}\n\n${formatApplication(t, ctx.lang, app)}`, { parse_mode: "HTML" });
}

/** Обработка введённого трек-номера (состояние await_track). */
export async function handleTrackInput(ctx: BotContext, text: string) {
  const t = tx(ctx);
  const track = normalizeTrack(text);
  if (!TRACK_RE.test(track)) {
    return ctx.reply(t.badTrack, { parse_mode: "HTML" });
  }
  const app = await getApplication(track);
  if (!app) {
    return ctx.reply(t.notFound, { reply_markup: notFoundKeyboard(t) });
  }
  await clearState(ctx.chat!.id);
  // Подписываем на уведомления о смене этапа; сбой подписки не мешает показать статус.
  await subscribeToApp(app.trackNumber, ctx.chat!.id).catch((e) => console.error("[bot] subscribe", e));
  await ctx.reply(formatApplication(t, ctx.lang, app), { parse_mode: "HTML" });
}
