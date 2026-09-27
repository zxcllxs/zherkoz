"use client";

import { useEffect, useRef, useState } from "react";
import { dateInputPlusDays } from "@/lib/format";
import { downloadText, parcelsCsv, signalsCsv } from "@/lib/csv";
import type { Parcel, PublicSignal } from "@/lib/types";

export default function ExportMenu({
  parcels,
  signals,
  now,
}: {
  parcels: Parcel[];
  signals: PublicSignal[];
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const date = dateInputPlusDays(0, now);
  const item = "block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
      >
        ⬇ Скачать отчёт CSV
      </button>
      {open && (
        <div className="absolute right-0 z-[1500] mt-1 w-56 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200">
          <button
            className={item}
            onClick={() => {
              downloadText(`zherkoz-uchastki-${date}.csv`, parcelsCsv(parcels, now));
              setOpen(false);
            }}
          >
            Участки ({parcels.length})
          </button>
          <button
            className={item}
            onClick={() => {
              downloadText(`zherkoz-signaly-${date}.csv`, signalsCsv(signals, parcels));
              setOpen(false);
            }}
          >
            Сигналы ({signals.length})
          </button>
        </div>
      )}
    </div>
  );
}
