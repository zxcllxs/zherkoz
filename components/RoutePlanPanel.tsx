"use client";

import type { PlannedStop, RoutePlan } from "@/lib/route-plan";

const km = (v: number) => `${v.toFixed(1).replace(".", ",")} км`;

export default function RoutePlanPanel({
  plan,
  onSelectStop,
  onReset,
}: {
  plan: RoutePlan;
  onSelectStop: (s: PlannedStop) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">План выезда</div>
        <div className="text-sm text-slate-700">
          Старт: {plan.startLabel} · точек: {plan.stops.length} · итого по прямой: <b>{km(plan.totalKm)}</b>
        </div>
      </div>

      {plan.stops.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">Сейчас нет точек для выезда</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {plan.links.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Открыть в Google Maps{plan.links.length > 1 ? ` — Маршрут ${i + 1}` : ""}
              </a>
            ))}
            {plan.links.length > 1 && (
              <p className="text-xs text-slate-500">
                Google Maps принимает до 9 промежуточных точек — маршрут разбит на части. Каждая следующая начинается с последней
                точки предыдущей.
              </p>
            )}
          </div>
          <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {plan.stops.map((s) => (
              <li key={`${s.kind}-${s.id}`}>
                <button onClick={() => onSelectStop(s)} className="flex min-h-11 w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      s.priority >= 3 ? "bg-red-600" : "bg-slate-600"
                    }`}
                  >
                    {s.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{s.title}</span>
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
