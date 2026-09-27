"use client";

import { formatDateTime } from "@/lib/format";
import type { PublicSignal } from "@/lib/types";
import { ReportsBadge, SignalStatusBadge } from "./StatusBadge";
import { SOURCE_LABEL, signalSource } from "@/lib/signal-utils";

export default function SignalList({
  signals,
  onSelect,
}: {
  signals: PublicSignal[];
  onSelect: (id: string) => void;
}) {
  if (signals.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-500">Сигналов пока нет</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {signals.map((s) => (
        <li key={s.id}>
          <button onClick={() => onSelect(s.id)} className="w-full px-4 py-3 text-left hover:bg-slate-50">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-slate-900">{s.id}</span>
              <SignalStatusBadge status={s.status} />
            </div>
            <div className="line-clamp-2 text-sm text-slate-700">{s.text}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {formatDateTime(s.createdAt)}
              <span>
                · {signalSource(s) === "satellite" ? "🛰 " : ""}источник: {SOURCE_LABEL[signalSource(s)]}
              </span>
              <ReportsBadge reports={s.reports} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
