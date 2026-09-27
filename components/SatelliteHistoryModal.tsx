"use client";

import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { MapContainer, Polygon, TileLayer } from "react-leaflet";
import { dataBounds, polygonToLeaflet } from "@/lib/geo";
import { PARCEL_STATUS_STYLE } from "@/lib/status";
import { S2_HISTORY_YEARS, S2_LICENSE_URL, S2_MAX_NATIVE_ZOOM, s2AttributionText, s2TileUrl } from "@/lib/satellite";
import type { Parcel } from "@/lib/types";
import Modal from "./Modal";

const YEARS_LABEL = `${S2_HISTORY_YEARS[0]}–${S2_HISTORY_YEARS[S2_HISTORY_YEARS.length - 1]}`;

/** Мини-карта одного года: только просмотр (без перетаскивания, зума и атрибуции — она общая внизу). */
function YearMap({ parcel, year }: { parcel: Parcel; year: number }) {
  const bounds = dataBounds([parcel])!;
  const color = PARCEL_STATUS_STYLE[parcel.status].color;
  return (
    <figure className="overflow-hidden rounded-lg ring-1 ring-slate-200">
      <div className="h-36 w-full bg-slate-100 sm:h-40">
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [16, 16], maxZoom: 16 }}
          maxZoom={16}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
        >
          <TileLayer url={s2TileUrl(year)} maxNativeZoom={S2_MAX_NATIVE_ZOOM} maxZoom={19} />
          <Polygon positions={polygonToLeaflet(parcel.geometry)} pathOptions={{ color, weight: 3, fill: false }} interactive={false} />
        </MapContainer>
      </div>
      <figcaption className="bg-white px-2 py-1 text-center text-sm font-semibold text-slate-800">{year}</figcaption>
    </figure>
  );
}

export default function SatelliteHistoryModal({
  parcel,
  onFlag,
  onClose,
}: {
  parcel: Parcel;
  onFlag: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flag = async () => {
    setBusy(true);
    setError(null);
    try {
      await onFlag();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  };

  return (
    <Modal title={`Спутниковая история · ${parcel.cadastralNumber}`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {S2_HISTORY_YEARS.map((y) => (
          <YearMap key={y} parcel={parcel} year={y} />
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200">
        Разрешение ~10 м: для участков &lt; 0,5 га снимки ориентировочные; для ИЖС в проде — снимки высокого разрешения.
      </p>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        {s2AttributionText(YEARS_LABEL)}. Лицензия{" "}
        <a href={S2_LICENSE_URL} target="_blank" rel="noopener noreferrer" className="underline">
          CC BY-NC-SA 4.0
        </a>
        .
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button onClick={onClose} className="min-h-11 rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Закрыть
        </button>
        <button
          onClick={flag}
          disabled={busy}
          className="min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Отметить: признаки неиспользования по снимкам"}
        </button>
      </div>
    </Modal>
  );
}
