// Адрес сайта для ссылок из бота. Берётся из запроса вебхука (тот же домен, что в setWebhook) — без отдельной env.
let baseUrl: string | null = null;

export function rememberBaseUrl(req: Request): void {
  try {
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") ?? url.host;
    const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    if (host) baseUrl = `${proto}://${host}`;
  } catch {
    // адрес не определён — ссылка просто не добавится
  }
}

/** Полная ссылка на публичную страницу или null, если адрес ещё не известен. */
export function publicPageUrl(): string | null {
  return baseUrl ? `${baseUrl}/public` : null;
}
