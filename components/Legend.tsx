import { PARCEL_STATUSES, PARCEL_STATUS_STYLE, SIGNAL_STATUS_STYLE } from "@/lib/status";
import type { SignalStatus } from "@/lib/types";

export default function Legend() {
  return (
    <div className="absolute bottom-6 left-3 z-[1000] rounded-lg bg-white/95 p-3 text-xs shadow-md ring-1 ring-slate-200">
      <div className="mb-1.5 font-semibold text-slate-700">Статус участка</div>
      <ul className="space-y-1">
        {PARCEL_STATUSES.map((s) => {
          const st = PARCEL_STATUS_STYLE[s];
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-4 rounded-sm"
                style={{
                  background: st.color,
                  opacity: 0.8,
                  outline: st.dashArray ? `2px dashed ${st.color}` : undefined,
                  outlineOffset: st.dashArray ? 1 : undefined,
                }}
              />
              <span className="text-slate-700">{st.label}</span>
            </li>
          );
        })}
      </ul>
      <div className="mb-1.5 mt-3 font-semibold text-slate-700">Сигналы жителей</div>
      <ul className="space-y-1">
        {(Object.keys(SIGNAL_STATUS_STYLE) as SignalStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: SIGNAL_STATUS_STYLE[s].color }} />
            <span className="text-slate-700">{SIGNAL_STATUS_STYLE[s].label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
