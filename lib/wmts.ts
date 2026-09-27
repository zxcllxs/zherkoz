// Разбор WMTS Capabilities EOX: самый свежий слой Sentinel-2 cloudless в EPSG:3857.
// Значения (шаблон URL, максимальный зум) берутся из самого XML, не хардкодятся.

export interface SatelliteLayer {
  layer: string; // например s2cloudless-2024_3857
  year: number;
  urlTemplate: string; // Leaflet-шаблон с {z}/{x}/{y}
  maxNativeZoom: number;
  attribution: string;
}

const LAYER_RE = /^s2cloudless-(\d{4})_3857$/;

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? decode(m[1]) : null;
}

/** Номер уровня из идентификатора TileMatrix: «14» или «EPSG:3857:14» → 14. */
function matrixLevel(id: string): number | null {
  const m = id.trim().match(/(\d+)$/);
  return m ? Number(m[1]) : null;
}

export function satelliteAttribution(year: number): string {
  return (
    `<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless — https://s2maps.eu</a> ` +
    `by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${year})`
  );
}

export function parseLatestS2Cloudless(xml: string): SatelliteLayer | null {
  // Определения наборов матриц (вне <Layer>): идентификатор → максимальный уровень.
  const withoutLayers = xml.replace(/<Layer>[\s\S]*?<\/Layer>/g, "");
  const setMax = new Map<string, number>();
  for (const m of withoutLayers.matchAll(/<TileMatrixSet>\s*<ows:Identifier>([^<]+)<\/ows:Identifier>([\s\S]*?)<\/TileMatrixSet>/g)) {
    const levels = [...m[2].matchAll(/<TileMatrix>\s*<ows:Identifier>([^<]+)<\/ows:Identifier>/g)]
      .map((x) => matrixLevel(x[1]))
      .filter((x): x is number => x !== null);
    if (levels.length) setMax.set(m[1].trim(), Math.max(...levels));
  }

  let best: SatelliteLayer | null = null;
  for (const m of xml.matchAll(/<Layer>([\s\S]*?)<\/Layer>/g)) {
    const block = m[1];
    const id = block.match(/<ows:Identifier>([^<]+)<\/ows:Identifier>/)?.[1].trim();
    const yearMatch = id?.match(LAYER_RE);
    if (!id || !yearMatch) continue;
    const year = Number(yearMatch[1]);
    if (best && best.year >= year) continue;

    const link = block.match(/<TileMatrixSetLink>([\s\S]*?)<\/TileMatrixSetLink>/)?.[1] ?? "";
    const tms = link.match(/<TileMatrixSet>([^<]+)<\/TileMatrixSet>/)?.[1].trim();
    if (!tms) continue;
    // Ограничения уровней для слоя (если заданы) важнее определения набора.
    const limits = [...link.matchAll(/<TileMatrix>([^<]+)<\/TileMatrix>/g)]
      .map((x) => matrixLevel(x[1]))
      .filter((x): x is number => x !== null);
    const maxNativeZoom = limits.length ? Math.max(...limits) : setMax.get(tms);
    if (maxNativeZoom === undefined) continue;

    const resource = [...block.matchAll(/<ResourceURL\b[^>]*>/g)]
      .map((x) => x[0])
      .find((tag) => attr(tag, "resourceType") === "tile");
    const template = resource ? attr(resource, "template") : null;
    if (!template || !template.startsWith("https://")) continue;
    const style = block.match(/<Style[^>]*isDefault="true"[^>]*>\s*<ows:Identifier>([^<]+)<\/ows:Identifier>/)?.[1].trim() ?? "default";

    const urlTemplate = template
      .replace(/\{Style\}/gi, style)
      .replace(/\{TileMatrixSet\}/gi, tms)
      .replace(/\{TileMatrix\}/gi, "{z}")
      .replace(/\{TileRow\}/gi, "{y}")
      .replace(/\{TileCol\}/gi, "{x}");
    if (/\{(?!z\}|x\}|y\})[^}]*\}/.test(urlTemplate)) continue; // неизвестные плейсхолдеры (например {Time})

    best = { layer: id, year, urlTemplate, maxNativeZoom, attribution: satelliteAttribution(year) };
  }
  return best;
}
