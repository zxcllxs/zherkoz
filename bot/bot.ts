import { Bot, type Context } from "grammy";
import { CB, mainMenu } from "./keyboards";
import { BTN, T } from "./texts";
import { clearState, getState } from "./state";
import { askTrack, handleTrackInput, showExample } from "./handlers/status";
import { showKnowledgeEntry, showKnowledgeList } from "./handlers/knowledge";
import {
  cancelReport,
  onHint,
  onLocation,
  onPhoto,
  onReportText,
  onSend,
  startReport,
  stepHint,
} from "./handlers/report";

let bot: Bot | null = null;

/** Ленивое создание бота: токен читается при первом вызове, не при импорте. */
export function getBot(): Bot {
  if (bot) return bot;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  bot = new Bot(token);
  registerHandlers(bot);
  return bot;
}

async function sendMenu(ctx: Context, text: string = T.menu) {
  await ctx.reply(text, { reply_markup: mainMenu() });
}

function registerHandlers(b: Bot) {
  // Только личные чаты.
  b.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== "private") return;
    await next();
  });

  // На каждый callback_query — answerCallbackQuery (сразу, чтобы убрать «часики»).
  b.on("callback_query", async (ctx, next) => {
    await ctx.answerCallbackQuery().catch((e) => console.error("[bot] answerCallbackQuery", e));
    await next();
  });

  b.command("start", async (ctx) => {
    await clearState(ctx.chat.id);
    await sendMenu(ctx, T.welcome);
  });

  // Кнопки главного меню сбрасывают любой незавершённый сценарий.
  b.hears(BTN.status, async (ctx) => askTrack(ctx));
  b.hears(BTN.knowledge, async (ctx) => {
    await clearState(ctx.chat.id);
    await showKnowledgeList(ctx);
  });

  b.hears(BTN.report, (ctx) => startReport(ctx));
  b.hears(BTN.cancel, async (ctx) => {
    const state = await getState(ctx.chat.id);
    if (state?.step.startsWith("report_")) return cancelReport(ctx);
    await clearState(ctx.chat.id);
    await sendMenu(ctx);
  });

  b.callbackQuery(CB.statusExample, (ctx) => showExample(ctx));
  b.callbackQuery(CB.statusRetry, (ctx) => askTrack(ctx));
  b.callbackQuery(CB.menu, async (ctx) => {
    await clearState(ctx.chat!.id);
    await sendMenu(ctx);
  });
  b.callbackQuery(CB.kbList, (ctx) => showKnowledgeList(ctx, true));
  b.callbackQuery(/^kb:(.+)$/, (ctx) => showKnowledgeEntry(ctx, ctx.match[1]));
  b.callbackQuery(/^rep:h:(\d+)$/, async (ctx) => onHint(ctx, await getState(ctx.chat!.id), Number(ctx.match[1])));
  b.callbackQuery(CB.repSend, async (ctx) => onSend(ctx, await getState(ctx.chat!.id)));
  b.callbackQuery(CB.repCancel, (ctx) => cancelReport(ctx));

  b.on("message:location", async (ctx) => {
    const state = await getState(ctx.chat.id);
    if (await onLocation(ctx, state)) return;
    return state ? stepHint(ctx, state) : sendMenu(ctx, T.useButtons);
  });

  b.on(["message:photo", "message:document"], async (ctx) => {
    const state = await getState(ctx.chat.id);
    if (await onPhoto(ctx, state)) return;
    return state ? stepHint(ctx, state) : sendMenu(ctx, T.useButtons);
  });

  b.on("message:text", async (ctx) => {
    const state = await getState(ctx.chat.id);
    if (state?.step === "await_track") return handleTrackInput(ctx, ctx.message.text);
    if (state?.step === "report_text") return onReportText(ctx, state, ctx.message.text);
    return state ? stepHint(ctx, state) : sendMenu(ctx, T.useButtons);
  });

  // Прочие сообщения/колбэки вне сценария.
  b.on("callback_query", () => {});
  b.on("message", async (ctx) => {
    const state = await getState(ctx.chat.id);
    return state ? stepHint(ctx, state) : sendMenu(ctx, T.useButtons);
  });

  b.catch((err) => {
    console.error("[bot] error in update", err.ctx.update.update_id, err.error);
    err.ctx.reply(T.error).catch(() => {});
  });
}
