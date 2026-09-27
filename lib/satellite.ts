// Sentinel-2 cloudless (EOX), EPSG:3857. Данные проверены вручную 27.09.2026:
// слои s2cloudless-<год>_3857 существуют для 2017–2025, TileMatrixSet «g»,
// порядок {TileMatrix}/{TileRow}/{TileCol} = {z}/{y}/{x}, тайлы отдаются с Access-Control-Allow-Origin: *.

export const S2_LATEST_YEAR = 2025;
export const S2_HISTORY_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;
export const S2_MAX_NATIVE_ZOOM = 15;
export const S2_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

export function s2TileUrl(year: number): string {
  return `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${year}_3857/default/g/{z}/{y}/{x}.jpg`;
}

/** Текст атрибуции (без HTML) — для подписей вне карты. */
export function s2AttributionText(years: string): string {
  return `Sentinel-2 cloudless — https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${years})`;
}

/** Атрибуция для Leaflet (HTML) со ссылками на s2maps.eu и лицензию. */
export function s2AttributionHtml(years: string): string {
  return (
    `<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless — https://s2maps.eu</a> ` +
    `by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${years}), ` +
    `<a href="${S2_LICENSE_URL}" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>`
  );
}
