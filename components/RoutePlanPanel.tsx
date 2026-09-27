"use client";

import type { PlannedStop, RoutePlan } from "@/lib/route-plan";

const km = (v: number) => `${v.toFixed(1).replace(".", ",")} км`;

export default function RoutePlanPanel({
  plan,
  urgentFirst,
  onToggleUrgentFirst,
  onSelectStop,
  onReset,
}: {
  plan: RoutePlan;
  urgentFirst: boolean;
  onToggleUrgentFirst: (v: boolean) => void;
  onSelectStop: (s: PlannedStop) => void;
  onReset: () => void;
}) {
  const v = urgentFirst ? plan.urgentFirst : plan.mixed;
  const diff = plan.urgentFirst.totalKm - plan.mixed.totalKm;
  const urgentCount = v.stops.filter((s) => s.urgent).length;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">План выезда</div>
        <div className="text-sm text-slate-700">
          Старт: {plan.startLabel} · точек: {v.stops.length}
          {urgentCount > 0 && ` (срочных: ${urgentCount})`}
        </div>
      </div>

      {v.stops.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">Сейчас нет точек для выезда</p>
      ) : (
        <>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-800">
            <input type="checkbox" checked={urgentFirst} onChange={(e) => onToggleUrgentFirst(e.target.checked)} />
            Сначала срочные
          </label>
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <div className={!urgentFirst ? "font-semibold text-slate-900" : ""}>
              Единый маршрут: {km(plan.mixed.totalKm)}
            </div>
            <div className={urgentFirst ? "font-semibold text-slate-900" : ""}>
              Сначала срочные: {km(plan.urgentFirst.totalKm)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {diff > 0.05
                ? `Единый маршрут короче на ${km(diff)} (по прямой).`
                : "Длина обоих вариантов практически одинакова (по прямой)."}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {v.links.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Открыть в Google Maps{v.links.length > 1 ? ` — Маршрут ${i + 1}` : ""}
              </a>
            ))}
            {v.links.length > 1 && (
              <p className="text-xs text-slate-500">
                Google Maps принимает до 9 промежуточных точек — маршрут разбит на части. Каждая следующая начинается с последней
                точки предыдущей.
              </p>
            )}
          </div>
          <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {v.stops.map((s) => (
              <li key={`${s.kind}-${s.id}`}>
                <button onClick={() => onSelectStop(s)} className="flex min-h-11 w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      s.urgent ? "bg-red-600" : "bg-blue-700"
                    }`}
                  >
                    {s.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                      {s.title}
                      {s.urgent && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">срочно</span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500">
                      приоритет {s.priority}
                      {s.reasons.length > 0 && ` · ${s.reasons.join(", ")}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-600">+{km(s.legKm)}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="text-sm text-slate-700">
            Итого по прямой: <b>{km(v.totalKm)}</b>
          </div>
        </>
      )}

      <button
        onClick={onReset}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
      >
        Сбросить план
      </button>
    </div>
  );
}
