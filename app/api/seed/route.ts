import { NextResponse } from "next/server";
import seed from "@/data/seed.json";
import { getRedis, KEYS } from "@/lib/redis";
import { jsonError, serverError } from "@/lib/http";
import type { SeedFile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET;
  if (!secret) return jsonError("SEED_SECRET не задан на сервере", 500);
  if (req.headers.get("x-seed-secret") !== secret) return jsonError("Неверный x-seed-secret", 401);

  try {
    const data = seed as unknown as SeedFile;
    const redis = getRedis();
    const toHash = <T,>(items: T[], key: (x: T) => string) =>
      Object.fromEntries(items.map((x) => [key(x), JSON.stringify(x)]));

    const p = redis.pipeline();
    p.del(KEYS.parcels, KEYS.apps, KEYS.signals);
    p.hset(KEYS.parcels, toHash(data.parcels, (x) => x.id));
    p.hset(KEYS.apps, toHash(data.applications, (x) => x.trackNumber));
    p.hset(KEYS.signals, toHash(data.signals, (x) => x.id));
    // Следующий сигнал из бота получит номер после seed-сигналов (S-0003).
    p.set(KEYS.signalSeq, data.signals.length);
    await p.exec();

    return NextResponse.json({
      ok: true,
      parcels: data.parcels.length,
      apps: data.applications.length,
      signals: data.signals.length,
    });
  } catch (e) {
    return serverError(e, "seed");
  }
}
