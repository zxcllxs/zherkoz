// Импорт/экспорт участков в GeoJSON. Координаты — только GeoJSON [lng, lat], без перестановок.
import area from "@turf/area";
import { z } from "zod";
import type { Parcel, PolygonGeometry } from "./types";

export const IMPORT_MAX_FEATURES = 200;

const Position = z
  .array(z.number().finite(), { error: "Координата должна быть массивом чисел [lng, lat]" })
  .min(2)
  .max(3)
  .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, "Координата вне диапазона [lng, lat]");

const Ring = z
  .array(Position)
  .min(4, "Кольцо полигона — минимум 4 точки")
  .refine((r) => r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1], "Кольцо полигона не замкнуто");

const ImportFeature = z.object({
  type: z.literal("Feature", { error: "Ожидается объект Feature" }),
  geometry: z.object({
    type: z.literal("Polygon", { error: "Поддерживается только геометрия Polygon" }),
    coordinates: z.array(Ring).min(1, "Пустой полигон"),
  }),
  properties: z.object({
    cadastralNumber: z.string({ error: "Нет свойства cadastralNumber" }).trim().min(1, "Пустой cadastralNumber").max(64),
    purpose: z.string().trim().max(300).optional(),
    areaHa: z.number().positive("areaHa должна быть больше 0").finite().optional(),
    address: z.string().trim().max(300).optional(),
  }),
});

export const ImportCollection = z.object({
  type: z.literal("FeatureCollection", { error: "Ожидается FeatureCollection" }),
  features: z
    .array(ImportFeature)
    .min(1, "В файле нет объектов")
    .max(IMPORT_MAX_FEATURES, `Не больше ${IMPORT_MAX_FEATURES} объектов за раз`),
});

export type ImportCollectionInput = z.infer<typeof ImportCollection>;

export interface ImportPlan {
  toAdd: Parcel[];
  skipped: { cadastralNumber: string; reason: string }[];
}

/** Площадь полигона в га (по геодезической формуле turf), 4 знака. */
export function polygonAreaHa(geometry: PolygonGeometry): number {
  return Math.round((area(geometry) / 10000) * 10000) / 10000;
}

function nextImportIds(existing: Parcel[], count: number): string[] {
  const max = existing.reduce((m, p) => {
    const n = p.id.match(/^I-(\d+)$/);
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return Array.from({ length: count }, (_, i) => `I-${String(max + i + 1).padStart(3, "0")}`);
}

/** План импорта: новые участки (status clean, id I-NNN) и пропуски дублей по cadastralNumber. */
export function planImport(input: ImportCollectionInput, existing: Parcel[], now: number = Date.now()): ImportPlan {
  const seen = new Set(existing.map((p) => p.cadastralNumber.trim()));
  const fresh: ImportCollectionInput["features"] = [];
  const skipped: ImportPlan["skipped"] = [];
  for (const f of input.features) {
    const cn = f.properties.cadastralNumber;
    if (seen.has(cn)) {
      skipped.push({ cadastralNumber: cn, reason: existing.some((p) => p.cadastralNumber === cn) ? "уже есть в реестре" : "дубль в файле" });
      continue;
    }
    seen.add(cn);
    fresh.push(f);
  }
  const ids = nextImportIds(existing, fresh.length);
  const at = new Date(now).toISOString();
  const toAdd = fresh.map((f, i): Parcel => {
    const geometry: PolygonGeometry = {
      type: "Polygon",
      coordinates: f.geometry.coordinates.map((ring) => ring.map((p) => [p[0], p[1]] as [number, number])),
    };
    return {
      id: ids[i],
      cadastralNumber: f.properties.cadastralNumber,
      purpose: f.properties.purpose || "Не указано",
      areaHa: f.properties.areaHa ?? polygonAreaHa(geometry),
      address: f.properties.address ?? "",
      geometry,
      status: "clean",
      photos: [],
      history: [{ at, action: "Участок импортирован из GeoJSON" }],
    };
  });
  return { toAdd, skipped };
}

/** Экспорт: FeatureCollection, в properties — все атрибуты участка кроме геометрии. */
export function parcelsToGeoJSON(parcels: Parcel[]) {
  return {
    type: "FeatureCollection" as const,
    features: parcels.map(({ geometry, ...props }) => ({ type: "Feature" as const, geometry, properties: props })),
  };
}
