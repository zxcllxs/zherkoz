import { getBot } from "@/bot/bot";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_ID_RE = /^[A-Za-z0-9_-]+$/;
const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Прокси фото из Telegram: токен бота остаётся на сервере.
export async function GET(_req: Request, ctx: RouteContext<"/api/tg-photo/[fileId]">) {
  const { fileId } = await ctx.params;
  if (!FILE_ID_RE.test(fileId) || fileId.length > 256) return jsonError("Некорректный fileId", 400);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return jsonError("TELEGRAM_BOT_TOKEN не задан", 500);

  try {
    const file = await getBot().api.getFile(fileId);
    if (!file.file_path) return jsonError("Файл недоступен", 404);
    const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) return jsonError("Не удалось получить файл из Telegram", 502);
    const ext = file.file_path.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME_BY_EXT[ext] ?? upstream.headers.get("content-type") ?? "application/octet-stream";
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // Ошибка Telegram (например, неверный file_id) — не раскрываем детали с токеном.
    console.error("[tg-photo]", e instanceof Error ? e.message.replace(token, "***") : e);
    return jsonError("Фото не найдено", 404);
  }
}
