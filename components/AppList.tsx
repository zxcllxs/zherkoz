"use client";

import { formatDateTime } from "@/lib/format";
import { APPLICATION_STAGE_COLOR, APPLICATION_STAGE_LABEL, procedureLabel } from "@/lib/status";
import type { Application } from "@/lib/types";

export function AppStageBadge({ stage }: { stage: Application["stage"] }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ background: APPLICATION_STAGE_COLOR[stage] }}
    >
      {APPLICATION_STAGE_LABEL[stage]}
    </span>
  );
}

export default function AppList({ apps, onSelect }: { apps: Application[]; onSelect: (track: string) => void }) {
  if (apps.length === 0) return <p className="p-6 text-center text-sm text-slate-500">Заявлений нет</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {apps.map((a) => (
        <li key={a.trackNumber}>
          <button onClick={() => onSelect(a.trackNumber)} className="w-full px-4 py-3 text-left hover:bg-slate-50">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-slate-900">{a.trackNumber}</span>
              <AppStageBadge stage={a.stage} />
            </div>
            <div className="text-sm text-slate-700">{procedureLabel(a.procedure)}</div>
            {a.stageNote && <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.stageNote}</div>}
            <div className="mt-1 text-xs text-slate-400">Обновлено: {formatDateTime(a.updatedAt)}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
