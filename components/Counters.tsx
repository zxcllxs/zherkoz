"use client";

export type CounterKey = "all" | "violations" | "check" | "newSignals" | "overdue";

export interface CounterItem {
  key: CounterKey;
  label: string;
  value: number;
  color: string; // цвет акцента
}

export default function Counters({
  items,
  active,
  onClick,
}: {
  items: CounterItem[];
  active: CounterKey | null;
  onClick: (k: CounterKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((c) => {
        const on = active === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onClick(c.key)}
            title="Показать только эти объекты"
            className={`flex items-baseline gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
              on ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            <span className="font-semibold" style={{ color: on ? undefined : c.color }}>
              {c.value}
            </span>
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
