import type { Context } from "grammy";
import { TEXTS, type Lang, type Texts } from "./texts";

/** Контекст бота с языком жителя (подставляется middleware в bot.ts). */
export type BotContext = Context & { lang: Lang };

export function tx(ctx: BotContext): Texts {
  return TEXTS[ctx.lang];
}
