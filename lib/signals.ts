import type { PublicSignal, Signal } from "./types";

/** Убирает chatId жителя перед отдачей в панель. */
export function toPublicSignal(s: Signal): PublicSignal {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { chatId, ...rest } = s;
  return rest;
}
