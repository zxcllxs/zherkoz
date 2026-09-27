import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { parseLatestS2Cloudless, type SatelliteLayer } from "@/lib/wmts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAPABILITIES_URL = "https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml";
const TTL_MS = 24 * 60 * 60 * 1000;

let cached: { value: SatelliteLayer; at: number } | null = null;

// Самый свежий слой s2cloudless-<год>_3857 из WMTS Capabilities EOX (кэш на сутки).
export async function GET() {
  if (!cached || Date.now() - cached.at > TTL_MS) {
    try {
      const res = await fetch(CAPABILITIES_URL, { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (!res.ok) return jsonError(`EOX WMTS недоступен (HTTP ${res.status})`, 502);
      const layer = parseLatestS2Cloudless(await res.text());
      if (!layer) return jsonError("В WMTS Capabilities не найден слой s2cloudless-*_3857", 502);
      cached = { value: layer, at: Date.now() };
    } catch (e) {
      console.error("[basemap]", e instanceof Error ? e.message : e);
      if (!cached) return jsonError("Не удалось получить список слоёв EOX", 502);
    }
  }
  return NextResponse.json(cached.value, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
