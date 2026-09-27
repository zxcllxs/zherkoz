import { NextResponse } from "next/server";
import { z } from "zod";
import { getParcel, getSignal, saveParcel, saveSignal } from "@/lib/redis";
import { jsonError, serverError } from "@/lib/http";
import { canSignalTransition, SIGNAL_STATUS_STYLE } from "@/lib/status";
import { addResidentPhoto, applyTransition } from "@/lib/parcels";
import { signalPhotoIds, toPublicSignal } from "@/lib/signals";
import { notifySignalStatus } from "@/lib/notify";
import type { Parcel, Signal, SignalStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  to: z.enum(["new", "checking", "confirmed", "rejected", "resolved"], { error: "Неизвестный статус сигнала" }),
  note: z.string().trim().max(1000).optional(),
  // Для «Подтвердить нарушение» с привязанным участком — перевод участка в detected.
  violation: z
    .object({
      violationType: z.enum(["unused", "seizure", "dump"], { error: "Неизвестный тип нарушения" }),
      deadline: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Некорректная дата"),
      comment: z.string().trim().max(1000).optional(),
    })
    .optional(),
});

const HISTORY: Partial<Record<SignalStatus, string>> = {
  checking: "взят в проверку",
  confirmed: "нарушение подтверждено",
  rejected: "не подтвердился",
  resolved: "нарушение устранено",
};

export async function PATCH(req: Request, ctx: RouteContext<"/api/signals/[id]">) {
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
    const signal = await getSignal(id);
    if (!signal) return jsonError("Сигнал не найден", 404);
    if (!canSignalTransition(signal.status, body.to)) {
      const from = SIGNAL_STATUS_STYLE[signal.status].label;
      const to = SIGNAL_STATUS_STYLE[body.to].label;
      return jsonError(`Переход «${from}» → «${to}» не разрешён`, 409);
    }
    if (body.to === "rejected" && !body.note) return jsonError("Укажите причину отклонения", 400);

    // Участок: при подтверждении — перевод в detected (через check, если нужно).
    let parcel: Parcel | null = null;
    if (body.to === "confirmed" && body.violation && signal.parcelId) {
      const current = await getParcel(signal.parcelId);
      if (current) {
        let p = current;
        if (p.status === "clean" || p.status === "resolved") {
          const r = applyTransition(p, { to: "check" }, `Проверка по сигналу ${signal.id}`);
          if ("error" in r) return jsonError(r.error, r.status);
          p = r.parcel;
        }
        const r = applyTransition(p, { to: "detected", ...body.violation });
        if ("error" in r) return jsonError(r.error, r.status);
        const last = r.parcel.history[r.parcel.history.length - 1];
        last.action += ` (по сигналу ${signal.id})`;
        parcel = r.parcel;
      }
    }

    const updated: Signal = {
      ...signal,
      status: body.to,
      ...(body.note ? { inspectorNote: body.note } : {}),
    };
    await saveSignal(updated);

    if (!parcel && signal.parcelId && HISTORY[body.to]) {
      const p = await getParcel(signal.parcelId);
      if (p) {
        parcel = {
          ...p,
          history: [...p.history, { at: new Date().toISOString(), action: `Сигнал ${signal.id}: ${HISTORY[body.to]}`, ...(body.note ? { comment: body.note } : {}) }],
        };
      }
    }
    // Нарушение подтверждено — фото жителя становится доказательством в карточке участка.
    if (parcel && body.to === "confirmed") {
      for (const fileId of signalPhotoIds(signal)) parcel = addResidentPhoto(parcel, signal.id, fileId);
    }
    if (parcel) await saveParcel(parcel);

    // Для текста «срок устранения до …» нужен актуальный участок.
    const linked = parcel ?? (signal.parcelId ? await getParcel(signal.parcelId).catch(() => null) : null);
    await notifySignalStatus(updated, linked);

    return NextResponse.json({ signal: toPublicSignal(updated), parcel });
  } catch (e) {
    return serverError(e, "signals PATCH");
  }
}
