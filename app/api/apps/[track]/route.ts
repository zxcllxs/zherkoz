import { NextResponse } from "next/server";
import { z } from "zod";
import { getApplication, saveApplication } from "@/lib/redis";
import { jsonError, serverError } from "@/lib/http";
import { notifyApplicationStage } from "@/lib/notify";
import type { Application } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACK_RE = /^KZ-\d{4}-\d{3}$/;

const Body = z
  .object({
    stage: z.enum(["review", "inspection", "approved", "rejected"], { error: "Неизвестный этап" }),
    stageNote: z.string().trim().max(1000, "Пояснение длиннее 1000 символов").default(""),
  })
  .refine((b) => b.stage !== "rejected" || b.stageNote.length > 0, {
    message: "При отказе пояснение обязательно",
  });

export async function PATCH(req: Request, ctx: RouteContext<"/api/apps/[track]">) {
  const { track } = await ctx.params;
  if (!TRACK_RE.test(track)) return jsonError("Некорректный трек-номер", 400);
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
    const app = await getApplication(track);
    if (!app) return jsonError("Заявление не найдено", 404);
    if (app.stage === body.stage && app.stageNote === body.stageNote) return jsonError("Ничего не изменилось", 400);

    const updated: Application = {
      ...app,
      stage: body.stage,
      stageNote: body.stageNote,
      updatedAt: new Date().toISOString(),
    };
    await saveApplication(updated);
    const notified = await notifyApplicationStage(updated);
    return NextResponse.json({ app: updated, notified });
  } catch (e) {
    return serverError(e, "apps PATCH");
  }
}
