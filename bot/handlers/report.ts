// «Народный контроль»: гео → фото → текст → подтверждение → Signal.
import { createSignalFromBot } from "@/lib/signals";
import { cancelKeyboard, confirmKeyboard, hintsKeyboard, locationKeyboard, mainMenu } from "../keyboards";
import { clearState, setState, type BotState } from "../state";
import { tx, type BotContext } from "../context";

const MAX_TEXT = 500;

export async function startReport(ctx: BotContext) {
  await setState(ctx.chat!.id, { step: "report_location" });
  await ctx.reply(tx(ctx).repStep1, { parse_mode: "HTML", reply_markup: locationKeyboard(tx(ctx)) });
}

export async function cancelReport(ctx: BotContext) {
  await clearState(ctx.chat!.id);
  if (ctx.callbackQuery) await ctx.editMessageReplyMarkup().catch(() => {});
  await ctx.reply(tx(ctx).repCancelled, { reply_markup: mainMenu(tx(ctx)) });
}

export async function onLocation(ctx: BotContext, state: BotState | null) {
  const loc = ctx.message?.location;
  if (!loc || state?.step !== "report_location") return false;
  await setState(ctx.chat!.id, { step: "report_photo", lat: loc.latitude, lng: loc.longitude });
  await ctx.reply(tx(ctx).repStep2, { parse_mode: "HTML", reply_markup: cancelKeyboard(tx(ctx)) });
  return true;
}

/** file_id фото: наибольший размер из photo[] или document с mime image/*. */
function extractPhotoFileId(ctx: BotContext): string | null {
  const m = ctx.message;
  if (!m) return null;
  if (m.photo?.length) return m.photo[m.photo.length - 1].file_id;
  if (m.document?.mime_type?.startsWith("image/")) return m.document.file_id;
  return null;
}

export async function onPhoto(ctx: BotContext, state: BotState | null) {
  if (state?.step !== "report_photo") return false;
  const fileId = extractPhotoFileId(ctx);
  if (!fileId) return false;
  await setState(ctx.chat!.id, { step: "report_text", lat: state.lat, lng: state.lng, photoFileId: fileId });
  await ctx.reply(tx(ctx).repStep3, { parse_mode: "HTML", reply_markup: hintsKeyboard(tx(ctx)) });
  return true;
}

async function toConfirm(ctx: BotContext, state: Extract<BotState, { step: "report_text" }>, text: string) {
  const { lat, lng, photoFileId } = state;
  await setState(ctx.chat!.id, { step: "report_confirm", lat, lng, photoFileId, text });
  await ctx.replyWithPhoto(state.photoFileId, {
    caption: tx(ctx).repConfirm(text),
    parse_mode: "HTML",
    reply_markup: confirmKeyboard(tx(ctx)),
  });
}

export async function onReportText(ctx: BotContext, state: BotState, raw: string) {
  if (state.step !== "report_text") return false;
  const text = raw.trim();
  if (!text) await ctx.reply(tx(ctx).repStep3Hint, { reply_markup: hintsKeyboard(tx(ctx)) });
  else if (text.length > MAX_TEXT) await ctx.reply(tx(ctx).repTooLong);
  else await toConfirm(ctx, state, text);
  return true;
}

export async function onHint(ctx: BotContext, state: BotState | null, index: number) {
  const hint = tx(ctx).hints[index];
  if (state?.step !== "report_text" || !hint) return ctx.reply(tx(ctx).repExpired, { reply_markup: mainMenu(tx(ctx)) });
  await toConfirm(ctx, state, hint);
}

export async function onSend(ctx: BotContext, state: BotState | null) {
  if (state?.step !== "report_confirm") return ctx.reply(tx(ctx).repExpired, { reply_markup: mainMenu(tx(ctx)) });
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
  await ctx.reply(tx(ctx).repAccepted(signal.id), { reply_markup: mainMenu(tx(ctx)) });
}

/** Неверный ввод на шаге: вежливая подсказка, шаг не сбрасываем. */
export async function stepHint(ctx: BotContext, state: BotState) {
  switch (state.step) {
    case "report_location":
      return ctx.reply(tx(ctx).repStep1Hint, { reply_markup: locationKeyboard(tx(ctx)) });
    case "report_photo":
      return ctx.reply(tx(ctx).repStep2Hint, { reply_markup: cancelKeyboard(tx(ctx)) });
    case "report_text":
      return ctx.reply(tx(ctx).repStep3Hint, { reply_markup: hintsKeyboard(tx(ctx)) });
    case "report_confirm":
      return ctx.reply(tx(ctx).repConfirmHint);
    default:
      return ctx.reply(tx(ctx).useButtons, { reply_markup: mainMenu(tx(ctx)) });
  }
}
