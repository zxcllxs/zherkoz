import { NextResponse } from "next/server";
import { getAllParcels, getRedis, KEYS } from "@/lib/redis";
import { jsonError, serverError } from "@/lib/http";
import { ImportCollection, planImport } from "@/lib/geojson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/parcels/import?dryRun=1 — только превью; без dryRun — сохранение новых участков.
export async function POST(req: Request) {
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Файл не является корректным JSON", 400);
  }
  const parsed = ImportCollection.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path[0] === "features" && typeof issue.path[1] === "number" ? `Объект №${issue.path[1] + 1}: ` : "";
    return jsonError(`${where}${issue?.message ?? "Некорректный GeoJSON"}`, 400);
  }

  try {
    const plan = planImport(parsed.data, await getAllParcels());
    if (!dryRun && plan.toAdd.length > 0) {
      await getRedis().hset(KEYS.parcels, Object.fromEntries(plan.toAdd.map((p) => [p.id, JSON.stringify(p)])));
    }
    return NextResponse.json({
      dryRun,
      added: plan.toAdd.length,
      skipped: plan.skipped,
      preview: plan.toAdd.map((p) => ({ id: p.id, cadastralNumber: p.cadastralNumber, areaHa: p.areaHa })),
      ...(dryRun ? {} : { parcels: plan.toAdd }),
    });
  } catch (e) {
    return serverError(e, "parcels import");
  }
}
