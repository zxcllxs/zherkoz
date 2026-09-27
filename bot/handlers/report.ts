// «Народный контроль»: гео → фото → текст → подтверждение → Signal.
import type { Context } from "grammy";
import { createSignalFromBot } from "@/lib/signals";
import { cancelKeyboard, confirmKeyboard, hintsKeyboard, locationKeyboard, mainMenu } from "../keyboards";
import { clearState, setState, type BotState } from "../state";
import { REPORT_HINTS, T } from "../texts";

const MAX_TEXT = 500;

export async function startReport(ctx: Context) {
  await setState(ctx.chat!.id, { step: "report_location" });
  await ctx.reply(T.repStep1, { parse_mode: "HTML", reply_markup: locationKeyboard() });
}

export async function cancelReport(ctx: Context) {
  await clearState(ctx.chat!.id);
  if (ctx.callbackQuery) await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(T.repCancelled, { reply_markup: mainMenu() });
}

export async function onLocation(ctx: Context, state: BotState | null) {
  const loc = ctx.message?.location;
  if (!loc || state?.step !== "report_location") return false;
  await setState(ctx.chat!.id, { step: "report_photo", lat: loc.latitude, lng: loc.longitude });
  await ctx.reply(T.repStep2, { parse_mode: "HTML", reply_markup: cancelKeyboard() });
  return true;
}

/** file_id фото: наибольший размер из photo[] или document с mime image/*. */
function extractPhotoFileId(ctx: Context): string | null {
  const m = ctx.message;
  if (!m) return null;
  if (m.photo?.length) return m.photo[m.photo.length - 1].file_id;
  if (m.document?.mime_type?.startsWith("image/")) return m.document.file_id;
  return null;
}

export async function onPhoto(ctx: Context, state: BotState | null) {
  if (state?.step !== "report_photo") return false;
  const fileId = extractPhotoFileId(ctx);
  if (!fileId) return false;
  await setState(ctx.chat!.id, { step: "report_text", lat: state.lat, lng: state.lng, photoFileId: fileId });
  await ctx.reply(T.repStep3, { parse_mode: "HTML", reply_markup: hintsKeyboard() });
  return true;
}

async function toConfirm(ctx: Context, state: Extract<BotState, { step: "report_text" }>, text: string) {
  const { lat, lng, photoFileId } = state;
  await setState(ctx.chat!.id, { step: "report_confirm", lat, lng, photoFileId, text });
  await ctx.replyWithPhoto(state.photoFileId, {
    caption: T.repConfirm(text),
    parse_mode: "HTML",
    reply_markup: confirmKeyboard(),
  });
}

export async function onReportText(ctx: Context, state: BotState, raw: string) {
  if (state.step !== "report_text") return false;
  const text = raw.trim();
  if (!text) await ctx.reply(T.repStep3Hint, { reply_markup: hintsKeyboard() });
  else if (text.length > MAX_TEXT) await ctx.reply(T.repTooLong);
  else await toConfirm(ctx, state, text);
  return true;
}

export async function onHint(ctx: Context, state: BotState | null, index: number) {
  const hint = REPORT_HINTS[index];
  if (state?.step !== "report_text" || !hint) return ctx.reply(T.repExpired, { reply_markup: mainMenu() });
  await toConfirm(ctx, state, hint);
}

export async function onSend(ctx: Context, state: BotState | null) {
  if (state?.step !== "report_confirm") return ctx.reply(T.repExpired, { reply_markup: mainMenu() });
  // Сначала сбрасываем состояние — повторное нажатие «Отправить» не создаст дубль.
  await clearState(ctx.chat!.id);
  await ctx.editMessageReplyMarkup().catch(() => {});
  const signal = await createSignalFromBot({
    chatId: ctx.chat!.id,
    lat: state.lat,
    lng: state.lng,
    photoFileId: state.photoFileId,
    text: state.text,
  });
  await ctx.reply(T.repAccepted(signal.id), { reply_markup: mainMenu() });
}

/** Неверный ввод на шаге: вежливая подсказка, шаг не сбрасываем. */
export async function stepHint(ctx: Context, state: BotState) {
  switch (state.step) {
    case "report_location":
      return ctx.reply(T.repStep1Hint, { reply_markup: locationKeyboard() });
    case "report_photo":
      return ctx.reply(T.repStep2Hint, { reply_markup: cancelKeyboard() });
    case "report_text":
      return ctx.reply(T.repStep3Hint, { reply_markup: hintsKeyboard() });
    case "report_confirm":
      return ctx.reply(T.repConfirmHint);
    default:
      return ctx.reply(T.useButtons, { reply_markup: mainMenu() });
  }
}
