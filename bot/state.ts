// Ручной конечный автомат диалога: ключ bot:state:{chatId}, TTL 1800 с.
import { getRedis, KEYS } from "@/lib/redis";
import type { Lang } from "./texts";

const TTL_SECONDS = 1800;

export type BotState =
  | { step: "await_track" }
  | { step: "report_location" }
  | { step: "report_photo"; lat: number; lng: number }
  | { step: "report_text"; lat: number; lng: number; photoFileId: string }
  | { step: "report_confirm"; lat: number; lng: number; photoFileId: string; text: string };

export async function getState(chatId: number): Promise<BotState | null> {
  return getRedis().get<BotState>(KEYS.botState(chatId));
}

export async function setState(chatId: number, state: BotState): Promise<void> {
  await getRedis().set(KEYS.botState(chatId), JSON.stringify(state), { ex: TTL_SECONDS });
}

export async function clearState(chatId: number): Promise<void> {
  await getRedis().del(KEYS.botState(chatId));
}

// Язык жителя: bot:lang:{chatId}, без TTL.
export async function getLang(chatId: number): Promise<Lang | null> {
  const v = await getRedis().get<string>(KEYS.botLang(chatId));
  return v === "ru" || v === "kk" ? v : null;
}

export async function setLang(chatId: number, lang: Lang): Promise<void> {
  await getRedis().set(KEYS.botLang(chatId), lang);
}
