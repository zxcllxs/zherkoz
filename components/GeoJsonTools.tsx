"use client";

import { useRef, useState } from "react";
import { importGeoJSON, type ImportResult } from "@/lib/api";
import { dateInputPlusDays } from "@/lib/format";
import { IMPORT_MAX_FEATURES, parcelsToGeoJSON } from "@/lib/geojson";
import type { Parcel } from "@/lib/types";
import Modal from "./Modal";
import { useToast } from "./Toasts";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // лимит тела запроса Vercel Functions — 4.5 MB

export default function GeoJsonTools({
  parcels,
  now,
  onImported,
}: {
  parcels: Parcel[];
  now: number;
  onImported: (added: Parcel[]) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: unknown; preview: ImportResult; fileName: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const exportAll = () => {
    const json = JSON.stringify(parcelsToGeoJSON(parcels), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/geo+json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `zherkoz-uchastki-${dateInputPlusDays(0, now)}.geojson`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return toast("Файл больше 4 МБ", "error");
    setBusy(true);
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("Файл не является корректным JSON");
      }
      const preview = await importGeoJSON(data, true);
      setPending({ data, preview, fileName: file.name });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка импорта", "error");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await importGeoJSON(pending.data, false);
      onImported(res.parcels ?? []);
      toast(`Импорт: добавлено ${res.added}, пропущено ${res.skipped.length}`, "success");
      setPending(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка импорта", "error");
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="flex gap-2 border-b border-slate-100 px-4 py-2">
      <button className={btn} onClick={exportAll} disabled={parcels.length === 0}>
        ⬇ Участки GeoJSON
      </button>
      <button className={btn} onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy && !pending ? "Проверка…" : "⬆ Импорт GeoJSON"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {pending && (
        <Modal title="Импорт участков" onClose={() => !busy && setPending(null)}>
          <p className="mb-3 text-sm text-slate-600">Файл: {pending.fileName}</p>
          <p className="mb-1 text-sm text-slate-900">
            Будет добавлено: <b>{pending.preview.added}</b>, пропущено: <b>{pending.preview.skipped.length}</b>
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Новые участки получат статус «Нарушений нет». Координаты — GeoJSON [lng, lat]. Не больше {IMPORT_MAX_FEATURES} объектов.
          </p>
          {pending.preview.skipped.length > 0 && (
            <div className="mb-3 max-h-32 overflow-y-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
              {pending.preview.skipped.map((s, i) => (
                <div key={`${s.cadastralNumber}-${i}`}>
                  {s.cadastralNumber} — {s.reason}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPending(null)}
              disabled={busy}
              className="min-h-11 rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Отмена
            </button>
            <button
              onClick={confirm}
              disabled={busy || pending.preview.added === 0}
              className="min-h-11 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {busy ? "Импорт…" : `Добавить ${pending.preview.added}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
