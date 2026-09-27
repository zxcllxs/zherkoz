import { webhookCallback } from "grammy";
import { getBot } from "@/bot/bot";
import { jsonError } from "@/lib/http";
import { rememberBaseUrl } from "@/bot/public-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(req: Request) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!process.env.TELEGRAM_BOT_TOKEN || !secretToken) {
    return jsonError("TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET не заданы", 500);
  }
  rememberBaseUrl(req);
  handler ??= webhookCallback(getBot(), "std/http", { secretToken });
  return handler(req);
}
