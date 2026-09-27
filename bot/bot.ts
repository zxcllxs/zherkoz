import { Bot } from "grammy";
import { CB, langKeyboard, mainMenu } from "./keyboards";
import { LANG_PROMPT, TEXTS, allLangs, type Lang } from "./texts";
import { tx, type BotContext } from "./context";
import { clearState, getLang, getState, setLang } from "./state";
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

let bot: Bot<BotContext> | null = null;

/** Ленивое создание бота: токен читается при первом вызове, не при импорте. */
export function getBot(): Bot<BotContext> {
  if (bot) return bot;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  bot = new Bot<BotContext>(token);
  registerHandlers(bot);
  return bot;
}

async function sendMenu(ctx: BotContext, text?: string) {
  const t = tx(ctx);
  await ctx.reply(text ?? t.menu, { reply_markup: mainMenu(t) });
}

function registerHandlers(b: Bot<BotContext>) {
  // Только личные чаты.
  b.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== "private") return;
    await next();
  });

  // Язык жителя (по умолчанию — русский, пока не выбран).
  b.use(async (ctx, next) => {
    ctx.lang = (ctx.chat ? await getLang(ctx.chat.id) : null) ?? "ru";
    await next();
  });

  // На каждый callback_query — answerCallbackQuery (сразу, чтобы убрать «часики»).
  b.on("callback_query", async (ctx, next) => {
    await ctx.answerCallbackQuery().catch((e) => console.error("[bot] answerCallbackQuery", e));
    await next();
  });

  // /start → выбор языка → приветствие и главное меню.
  b.command("start", async (ctx) => {
    await clearState(ctx.chat.id);
    await ctx.reply(LANG_PROMPT, { reply_markup: langKeyboard() });
  });

  b.callbackQuery(/^lang:(ru|kk)$/, async (ctx) => {
    const lang = ctx.match[1] as Lang;
    await setLang(ctx.chat!.id, lang);
    ctx.lang = lang;
    await ctx.editMessageReplyMarkup().catch(() => {});
    await sendMenu(ctx, tx(ctx).welcome);
  });

  // Кнопки главного меню (на любом языке) сбрасывают незавершённый сценарий.
  b.hears(allLangs("status"), (ctx) => askTrack(ctx));
  b.hears(allLangs("knowledge"), async (ctx) => {
    await clearState(ctx.chat.id);
    await showKnowledgeList(ctx);
  });
  b.hears(allLangs("report"), (ctx) => startReport(ctx));
  b.hears(allLangs("cancel"), async (ctx) => {
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
    return state ? stepHint(ctx, state) : sendMenu(ctx, tx(ctx).useButtons);
  });

  b.on(["message:photo", "message:document"], async (ctx) => {
    const state = await getState(ctx.chat.id);
    if (await onPhoto(ctx, state)) return;
    return state ? stepHint(ctx, state) : sendMenu(ctx, tx(ctx).useButtons);
  });

  b.on("message:text", async (ctx) => {
    const state = await getState(ctx.chat.id);
    if (state?.step === "await_track") return handleTrackInput(ctx, ctx.message.text);
    if (state?.step === "report_text") return onReportText(ctx, state, ctx.message.text);
    return state ? stepHint(ctx, state) : sendMenu(ctx, tx(ctx).useButtons);
  });

  // Прочие сообщения/колбэки вне сценария.
  b.on("callback_query", () => {});
  b.on("message", async (ctx) => {
    const state = await getState(ctx.chat.id);
    return state ? stepHint(ctx, state) : sendMenu(ctx, tx(ctx).useButtons);
  });

  b.catch((err) => {
    console.error("[bot] error in update", err.ctx.update.update_id, err.error);
    err.ctx.reply(TEXTS[err.ctx.lang ?? "ru"].error).catch(() => {});
  });
}
