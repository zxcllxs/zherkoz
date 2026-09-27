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
