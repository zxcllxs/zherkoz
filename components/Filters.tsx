"use client";

import { PARCEL_STATUSES, PARCEL_STATUS_STYLE } from "@/lib/status";
import type { ParcelStatus } from "@/lib/types";

export interface ParcelFilter {
  statuses: ParcelStatus[];
  query: string;
  overdueOnly: boolean;
}

export const EMPTY_FILTER: ParcelFilter = { statuses: [...PARCEL_STATUSES], query: "", overdueOnly: false };

export default function Filters({
  value,
  onChange,
}: {
  value: ParcelFilter;
  onChange: (f: ParcelFilter) => void;
}) {
  const toggle = (s: ParcelStatus) => {
    const has = value.statuses.includes(s);
    onChange({ ...value, statuses: has ? value.statuses.filter((x) => x !== s) : [...value.statuses, s] });
  };
  return (
    <div className="space-y-2 border-b border-slate-100 px-4 py-3">
      <input
        type="search"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        placeholder="Поиск по кадастровому номеру"
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {PARCEL_STATUSES.map((s) => (
          <label key={s} className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
            <input type="checkbox" checked={value.statuses.includes(s)} onChange={() => toggle(s)} />
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: PARCEL_STATUS_STYLE[s].color }} />
            {PARCEL_STATUS_STYLE[s].label}
          </label>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={value.overdueOnly}
          onChange={(e) => onChange({ ...value, overdueOnly: e.target.checked })}
        />
        ⏰ Только просроченные
      </label>
    </div>
  );
}

export function applyFilter<T extends { status: ParcelStatus; cadastralNumber: string }>(
  items: T[],
  f: ParcelFilter,
  isOverdue: (x: T) => boolean,
): T[] {
  const q = f.query.trim().toLowerCase();
  return items.filter(
    (p) =>
      f.statuses.includes(p.status) &&
      (!q || p.cadastralNumber.toLowerCase().includes(q)) &&
      (!f.overdueOnly || isOverdue(p)),
  );
}
