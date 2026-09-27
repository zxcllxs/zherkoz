import { NextResponse } from "next/server";
import { getAllParcels, getAllSignals } from "@/lib/redis";
import { serverError } from "@/lib/http";
import { toPublicSignal } from "@/lib/signals";
import type { StateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [parcels, signals] = await Promise.all([getAllParcels(), getAllSignals()]);
    const body: StateResponse = {
      parcels,
      signals: signals.map(toPublicSignal),
      serverTime: new Date().toISOString(),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return serverError(e, "state");
  }
}
