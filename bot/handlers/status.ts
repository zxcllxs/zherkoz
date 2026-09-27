import type { Context } from "grammy";
import { getApplication } from "@/lib/redis";
import { formatDateTime } from "@/lib/format";
import { procedureLabel } from "@/lib/status";
import type { Application } from "@/lib/types";
import { askTrackKeyboard, notFoundKeyboard } from "../keyboards";
import { clearState, setState } from "../state";
import { T, escapeHtml } from "../texts";

const TRACK_RE = /^KZ-\d{4}-\d{3}$/;
export const EXAMPLE_TRACK = "KZ-2026-042";

export function normalizeTrack(input: string): string {
  return input.trim().toUpperCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, "");
}

function pipeline(app: Application): string {
  switch (app.stage) {
    case "review":
      return "✅ Подано → 🔵 На рассмотрении → ⚪ Выезд инспектора → ⚪ Решение";
    case "inspection":
      return "✅ Подано → ✅ На рассмотрении → 🔵 Выезд инспектора → ⚪ Решение";
    case "approved":
      return "✅ Подано → ✅ На рассмотрении → ✅ Выезд инспектора → ✅ Решение: одобрено";
    case "rejected":
      return "✅ Подано → ✅ На рассмотрении → ❌ Решение: отказ";
  }
}

export function formatApplication(app: Application): string {
  const lines = [
    `<b>Заявление ${escapeHtml(app.trackNumber)}</b>`,
    `Процедура: ${escapeHtml(procedureLabel(app.procedure))}`,
    pipeline(app),
  ];
  if (app.stage === "rejected") {
    lines.push(`❌ <b>Пояснение:</b> ${escapeHtml(app.stageNote || "причина не указана")}`);
  } else if (app.stageNote) {
    lines.push(`Пояснение: ${escapeHtml(app.stageNote)}`);
  }
  lines.push(`Обновлено: ${formatDateTime(app.updatedAt)}`);
  return lines.join("\n");
}

export async function askTrack(ctx: Context) {
  await setState(ctx.chat!.id, { step: "await_track" });
  await ctx.reply(T.askTrack, { parse_mode: "HTML", reply_markup: askTrackKeyboard() });
}

export async function showExample(ctx: Context) {
  const app = await getApplication(EXAMPLE_TRACK);
  if (!app) return ctx.reply(T.askTrack, { parse_mode: "HTML" });
  await ctx.reply(`${T.exampleHeader}\n\n${formatApplication(app)}`, { parse_mode: "HTML" });
}

/** Обработка введённого трек-номера (состояние await_track). */
export async function handleTrackInput(ctx: Context, text: string) {
  const track = normalizeTrack(text);
  if (!TRACK_RE.test(track)) {
    return ctx.reply(T.badTrack, { parse_mode: "HTML" });
  }
  const app = await getApplication(track);
  if (!app) {
    return ctx.reply(T.notFound, { reply_markup: notFoundKeyboard() });
  }
  await clearState(ctx.chat!.id);
  await ctx.reply(formatApplication(app), { parse_mode: "HTML" });
}
