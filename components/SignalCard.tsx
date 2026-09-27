"use client";

import { useState } from "react";
import { patchSignal, type SignalPatch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { PARCEL_STATUS_STYLE, SIGNAL_STATUS_STYLE } from "@/lib/status";
import type { Parcel, ParcelStatus, PublicSignal } from "@/lib/types";
import { SignalStatusBadge } from "./StatusBadge";
import ViolationModal from "./ViolationModal";
import RejectModal from "./RejectModal";
import Lightbox from "./Lightbox";
import { useToast } from "./Toasts";

// Из этих статусов участок можно перевести в «Нарушение выявлено» (clean/resolved — через проверку).
const CAN_DETECT: ParcelStatus[] = ["clean", "check", "resolved"];

export default function SignalCard({
  signal,
  parcel,
  onBack,
  onOpenParcel,
  onUpdated,
}: {
  signal: PublicSignal;
  parcel: Parcel | null;
  onBack: () => void;
  onOpenParcel: (id: string) => void;
  onUpdated: (s: PublicSignal, p: Parcel | null) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"violation" | "reject" | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  const photoUrl = signal.photoFileId ? `/api/tg-photo/${encodeURIComponent(signal.photoFileId)}` : null;

  const send = async (body: SignalPatch) => {
    const res = await patchSignal(signal.id, body);
    onUpdated(res.signal, res.parcel);
    toast(`Сигнал ${signal.id}: ${SIGNAL_STATUS_STYLE[res.signal.status].label}`, "success");
  };

  const act = async (body: SignalPatch) => {
    setBusy(true);
    try {
      await send(body);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "error");
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (parcel && CAN_DETECT.includes(parcel.status)) setModal("violation");
    else act({ to: "confirmed" });
  };

  const btn = "rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white shadow-sm disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4 p-4">
      <button onClick={onBack} className="self-start text-sm text-blue-700 hover:underline">
        ← К списку сигналов
      </button>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Сигнал жителя</div>
        <div className="font-mono text-lg font-semibold text-slate-900">{signal.id}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SignalStatusBadge status={signal.status} />
          {signal.isDemoSeed && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">тестовые данные</span>
          )}
        </div>
      </div>

      {photoUrl && !imgError ? (
        <button onClick={() => setLightbox(true)} className="overflow-hidden rounded-lg bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={`Фото к сигналу ${signal.id}`}
            className="max-h-64 w-full object-cover"
            onError={() => setImgError(true)}
          />
        </button>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          {photoUrl ? "фото не удалось загрузить" : "фото не приложено"}
        </div>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-slate-500">Описание</dt>
        <dd className="whitespace-pre-wrap text-slate-900">{signal.text}</dd>
        <dt className="text-slate-500">Поступил</dt>
        <dd className="text-slate-900">{formatDateTime(signal.createdAt)}</dd>
        <dt className="text-slate-500">Участок</dt>
        <dd>
          {parcel ? (
            <button onClick={() => onOpenParcel(parcel.id)} className="text-left text-blue-700 hover:underline">
              {parcel.cadastralNumber}
              <span className="ml-1 text-slate-500">({PARCEL_STATUS_STYLE[parcel.status].label})</span>
            </button>
          ) : (
            <span className="text-slate-600">вне зарегистрированных участков</span>
          )}
        </dd>
        {signal.inspectorNote && (
          <>
            <dt className="text-slate-500">Причина</dt>
            <dd className="text-slate-900">{signal.inspectorNote}</dd>
          </>
        )}
      </dl>

      {(signal.status === "new" || signal.status === "checking" || signal.status === "confirmed") && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Действия</div>
          {signal.status === "new" && (
            <button disabled={busy} onClick={() => act({ to: "checking" })} className={`${btn} bg-blue-600 hover:bg-blue-700`}>
              Взять в проверку
            </button>
          )}
          {(signal.status === "new" || signal.status === "checking") && (
            <>
              <button disabled={busy} onClick={confirm} className={`${btn} bg-red-600 hover:bg-red-700`}>
                Подтвердить нарушение
              </button>
              <button disabled={busy} onClick={() => setModal("reject")} className={`${btn} bg-slate-600 hover:bg-slate-700`}>
                Отклонить
              </button>
            </>
          )}
          {signal.status === "confirmed" && (
            <button disabled={busy} onClick={() => act({ to: "resolved" })} className={`${btn} bg-emerald-600 hover:bg-emerald-700`}>
              Устранено
            </button>
          )}
        </div>
      )}

      {modal === "violation" && parcel && (
        <ViolationModal
          title="Подтвердить нарушение"
          cadastralNumber={parcel.cadastralNumber}
          initialComment={`По сигналу ${signal.id}: ${signal.text}`.slice(0, 1000)}
          onClose={() => setModal(null)}
          onSubmit={async (v) => {
            await send({ to: "confirmed", violation: v });
            setModal(null);
          }}
        />
      )}
      {modal === "reject" && (
        <RejectModal
          signalId={signal.id}
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await send({ to: "rejected", note: reason });
            setModal(null);
          }}
        />
      )}
      {lightbox && photoUrl && <Lightbox src={photoUrl} onClose={() => setLightbox(false)} />}
    </div>
  );
}
