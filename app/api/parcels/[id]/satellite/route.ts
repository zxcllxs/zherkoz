import { NextResponse } from "next/server";
import { getParcel } from "@/lib/redis";
import { jsonError, serverError } from "@/lib/http";
import { createSatelliteSignal, toPublicSignal } from "@/lib/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: отметка инспектора «признаки неиспользования по спутниковым снимкам».
export async function POST(_req: Request, ctx: RouteContext<"/api/parcels/[id]/satellite">) {
  const { id } = await ctx.params;
  try {
    const parcel = await getParcel(id);
    if (!parcel) return jsonError("Участок не найден", 404);
    const res = await createSatelliteSignal(parcel);
    if ("error" in res) return jsonError(res.error, res.status);
    return NextResponse.json({ signal: toPublicSignal(res.signal), parcel: res.parcel });
  } catch (e) {
    return serverError(e, "parcels satellite");
  }
}
