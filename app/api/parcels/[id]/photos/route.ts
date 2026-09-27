import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getParcel, saveParcel } from "@/lib/redis";
import { jsonError, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request, ctx: RouteContext<"/api/parcels/[id]/photos">) {
  const { id } = await ctx.params;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return jsonError("BLOB_READ_WRITE_TOKEN не задан на сервере", 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Ожидается multipart/form-data с полем file", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Файл не передан (поле file)", 400);
  const ext = EXT[file.type];
  if (!ext) return jsonError("Допустимы только JPEG, PNG или WebP", 415);
  if (file.size > MAX_BYTES) return jsonError("Файл больше 4 МБ", 413);

  try {
    const parcel = await getParcel(id);
    if (!parcel) return jsonError("Участок не найден", 404);

    const blob = await put(`parcels/${id}/photo.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    // Перечитываем участок перед записью, чтобы не затереть параллельные изменения.
    const fresh = (await getParcel(id)) ?? parcel;
    const updated = {
      ...fresh,
      photos: [...fresh.photos, blob.url],
      history: [...fresh.history, { at: new Date().toISOString(), action: "Добавлено фото" }],
    };
    await saveParcel(updated);
    return NextResponse.json({ parcel: updated, url: blob.url });
  } catch (e) {
    return serverError(e, "parcels photos POST");
  }
}
