import { PARCEL_STATUS_STYLE, SIGNAL_STATUS_STYLE } from "@/lib/status";
import type { ParcelStatus, SignalStatus } from "@/lib/types";

export function ParcelStatusBadge({ status }: { status: ParcelStatus }) {
  const s = PARCEL_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ background: s.color }}
    >
      {s.label}
    </span>
  );
}

export function SignalStatusBadge({ status }: { status: SignalStatus }) {
  const s = SIGNAL_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ background: s.color }}
    >
      {s.label}
    </span>
  );
}

/** «сообщили N жителей» — только если N > 1. */
export function ReportsBadge({ reports }: { reports?: number }) {
  const n = reports ?? 1;
  if (n <= 1) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-200">
      сообщили {n} жителей
    </span>
  );
}
