import { Redis } from "@upstash/redis";
import type { Application, Parcel, Signal } from "./types";

export const KEYS = {
  parcels: "parcels",
  signals: "signals",
  apps: "apps",
  signalSeq: "signal:seq",
  botState: (chatId: number) => `bot:state:${chatId}`,
} as const;

let client: Redis | null = null;

/** Ленивая инициализация: env читается только при первом вызове, не при импорте. */
export function getRedis(): Redis {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN не заданы");
    }
    client = new Redis({ url, token });
  }
  return client;
}

// @upstash/redis автоматически десериализует JSON-значения хэша.
async function hvalues<T>(key: string): Promise<T[]> {
  const all = await getRedis().hgetall<Record<string, T>>(key);
  return all ? Object.values(all) : [];
}

export async function getAllParcels(): Promise<Parcel[]> {
  const list = await hvalues<Parcel>(KEYS.parcels);
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getAllSignals(): Promise<Signal[]> {
  const list = await hvalues<Signal>(KEYS.signals);
  return list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getParcel(id: string): Promise<Parcel | null> {
  return getRedis().hget<Parcel>(KEYS.parcels, id);
}

export async function saveParcel(p: Parcel): Promise<void> {
  await getRedis().hset(KEYS.parcels, { [p.id]: JSON.stringify(p) });
}

export async function getSignal(id: string): Promise<Signal | null> {
  return getRedis().hget<Signal>(KEYS.signals, id);
}

export async function saveSignal(s: Signal): Promise<void> {
  await getRedis().hset(KEYS.signals, { [s.id]: JSON.stringify(s) });
}

export async function getApplication(trackNumber: string): Promise<Application | null> {
  return getRedis().hget<Application>(KEYS.apps, trackNumber);
}
