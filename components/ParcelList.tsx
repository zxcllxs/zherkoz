"use client";

import { PARCEL_STATUS_STYLE, VIOLATION_LABEL, isOverdue } from "@/lib/status";
import type { Parcel } from "@/lib/types";

export default function ParcelList({
  parcels,
  now,
  onSelect,
}: {
  parcels: Parcel[];
  now: number;
  onSelect: (id: string) => void;
}) {
  if (parcels.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-500">Участки не найдены</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {parcels.map((p) => {
        const st = PARCEL_STATUS_STYLE[p.status];
        const overdue = isOverdue(p, now);
        return (
          <li key={p.id}>
            <button onClick={() => onSelect(p.id)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: st.color }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-mono text-sm text-slate-900">
                  {p.cadastralNumber}
                  {overdue && <span title="Срок устранения просрочен">⏰</span>}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {st.label}
                  {p.violationType && ` · ${VIOLATION_LABEL[p.violationType]}`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
