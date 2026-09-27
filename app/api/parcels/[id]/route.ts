import { NextResponse } from "next/server";
import { z } from "zod";
import { getParcel, saveParcel } from "@/lib/redis";
import { jsonError, serverError } from "@/lib/http";
import { PARCEL_STATUSES } from "@/lib/status";
import { applyTransition, changeDeadline } from "@/lib/parcels";
import type { ParcelStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Два режима: { to, ... } — смена статуса; { deadline } без to — изменение контрольного срока.
const Body = z.object({
  to: z.enum(PARCEL_STATUSES as [ParcelStatus, ...ParcelStatus[]], { error: "Неизвестный статус" }).optional(),
  violationType: z.enum(["unused", "seizure", "dump"], { error: "Неизвестный тип нарушения" }).optional(),
  deadline: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Некорректная дата")
    .optional(),
  comment: z.string().trim().max(1000).optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/parcels/[id]">) {
  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Тело запроса должно быть JSON", 400);
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);
  const body = parsed.data;

  try {
    const parcel = await getParcel(id);
    if (!parcel) return jsonError("Участок не найден", 404);
    let updated;
    if (body.to) {
      updated = applyTransition(parcel, { ...body, to: body.to });
    } else if (body.deadline) {
      updated = changeDeadline(parcel, body.deadline);
    } else {
      return jsonError("Укажите новый статус (to) или контрольный срок (deadline)", 400);
    }
    if ("error" in updated) return jsonError(updated.error, updated.status);
    await saveParcel(updated.parcel);
    return NextResponse.json({ parcel: updated.parcel });
  } catch (e) {
    return serverError(e, "parcels PATCH");
  }
}
