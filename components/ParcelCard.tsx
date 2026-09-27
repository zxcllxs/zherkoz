"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { flagSatellite, patchParcel, patchParcelDeadline, uploadParcelPhoto } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { deadlineText, formatDate, formatDateTime } from "@/lib/format";
import { DEADLINE_STATUSES, PARCEL_STATUS_STYLE, PARCEL_TRANSITIONS, VIOLATION_LABEL, isOverdue } from "@/lib/status";
import type { Parcel, ParcelStatus, PublicSignal } from "@/lib/types";
import { ParcelStatusBadge } from "./StatusBadge";
import ViolationModal from "./ViolationModal";
import DeadlineModal from "./DeadlineModal";
import Lightbox from "./Lightbox";
import { useToast } from "./Toasts";

// Мини-карты Leaflet — только на клиенте.
const SatelliteHistoryModal = dynamic(() => import("./SatelliteHistoryModal"), { ssr: false });

const BUTTON_STYLE: Partial<Record<ParcelStatus, string>> = {
  detected: "bg-red-600 hover:bg-red-700 text-white",
  returned: "bg-slate-600 hover:bg-slate-700 text-white",
  clean: "bg-emerald-600 hover:bg-emerald-700 text-white",
  resolved: "bg-emerald-600 hover:bg-emerald-700 text-white",
  check: "bg-amber-500 hover:bg-amber-600 text-white",
  in_progress: "bg-orange-600 hover:bg-orange-700 text-white",
};

export default function ParcelCard({
  parcel,
  now,
  onBack,
  onUpdated,
  onSignalCreated,
}: {
  parcel: Parcel;
  now: number;
  onBack: () => void;
  onUpdated: (p: Parcel) => void;
  onSignalCreated?: (s: PublicSignal, p: Parcel) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState(false);
  const [deadlineModal, setDeadlineModal] = useState(false);
  const [satModal, setSatModal] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const st = PARCEL_STATUS_STYLE[parcel.status];
  const transitions = PARCEL_TRANSITIONS[parcel.status];
  const overdue = isOverdue(parcel, now);
  const canChangeDeadline = DEADLINE_STATUSES.includes(parcel.status);

  const doTransition = async (to: ParcelStatus) => {
    if (to === "detected") return setModal(true);
    if (to === "returned" && !window.confirm("Вернуть участок государству? Это финальный статус.")) return;
    setBusy(true);
    try {
      const { parcel: p } = await patchParcel(parcel.id, { to });
      onUpdated(p);
      toast(`Статус: ${PARCEL_STATUS_STYLE[p.status].label}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "error");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      if (blob.size > 4 * 1024 * 1024) throw new Error("Фото слишком большое даже после сжатия");
      const { parcel: p } = await uploadParcelPhoto(parcel.id, blob);
      onUpdated(p);
      toast("Фото добавлено", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Не удалось загрузить фото", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <button onClick={onBack} className="self-start text-sm text-blue-700 hover:underline">
        ← К списку
      </button>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Кадастровый номер</div>
        <div className="font-mono text-lg font-semibold text-slate-900">{parcel.cadastralNumber}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ParcelStatusBadge status={parcel.status} />
          {st.badge && (
            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700">{st.badge}</span>
          )}
          {parcel.isTest && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">тестовые данные</span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-slate-500">Назначение</dt>
        <dd className="text-slate-900">{parcel.purpose}</dd>
        <dt className="text-slate-500">Площадь</dt>
        <dd className="text-slate-900">{parcel.areaHa.toFixed(4)} га</dd>
        <dt className="text-slate-500">Адрес</dt>
        <dd className="text-slate-900">{parcel.address}</dd>
        {parcel.violationType && (
          <>
            <dt className="text-slate-500">Нарушение</dt>
            <dd className="font-medium text-red-700">{VIOLATION_LABEL[parcel.violationType]}</dd>
          </>
        )}
        {parcel.deadline && (
          <>
            <dt className="text-slate-500">Контрольный срок</dt>
            <dd className="text-slate-900">
              {formatDate(parcel.deadline)}
              {(parcel.status === "detected" || parcel.status === "in_progress") && (
                <span className={`ml-2 font-medium ${overdue ? "text-red-700" : "text-slate-600"}`}>
                  {overdue && "⏰ "}
                  {deadlineText(parcel.deadline, now).text}
                </span>
              )}
            </dd>
          </>
        )}
      </dl>

      {transitions.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Действия</div>
          {transitions.map((t) => (
            <button
              key={t.to}
              disabled={busy}
              onClick={() => doTransition(t.to)}
              className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium shadow-sm disabled:opacity-50 ${
                BUTTON_STYLE[t.to] ?? "bg-slate-700 text-white"
              }`}
            >
              {t.action}
            </button>
          ))}
          {canChangeDeadline && (
            <button
              disabled={busy}
              onClick={() => setDeadlineModal(true)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              📅 Изменить срок
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Снимки и документы</div>
        <button
          onClick={() => setSatModal(true)}
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          🛰 Спутниковая история
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Фото ({parcel.photos.length})
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading ? "Загрузка…" : "📷 Добавить фото"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        {parcel.photos.length === 0 ? (
          <p className="text-sm text-slate-400">Фото пока нет</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {parcel.photos.map((url) => (
              <PhotoThumb key={url} url={url} onOpen={() => setLightbox(url)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">История</div>
        <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4">
          {[...parcel.history].reverse().map((h, i) => (
            <li key={`${h.at}-${i}`} className="text-sm">
              <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-slate-400" />
              <div className="text-xs text-slate-500">{formatDateTime(h.at)}</div>
              <div className="text-slate-900">{h.action}</div>
              {h.comment && <div className="mt-0.5 text-slate-600">«{h.comment}»</div>}
            </li>
          ))}
        </ol>
      </div>

      {modal && (
        <ViolationModal
          cadastralNumber={parcel.cadastralNumber}
          onClose={() => setModal(false)}
          onSubmit={async (v) => {
            const { parcel: p } = await patchParcel(parcel.id, { to: "detected", ...v });
            onUpdated(p);
            setModal(false);
            toast("Нарушение зафиксировано", "success");
          }}
        />
      )}
      {satModal && (
        <SatelliteHistoryModal
          parcel={parcel}
          onClose={() => setSatModal(false)}
          onFlag={async () => {
            const res = await flagSatellite(parcel.id);
            onUpdated(res.parcel);
            onSignalCreated?.(res.signal, res.parcel);
            setSatModal(false);
            toast(`Создан сигнал ${res.signal.id} (источник: спутник)`, "success");
          }}
        />
      )}
      {deadlineModal && (
        <DeadlineModal
          cadastralNumber={parcel.cadastralNumber}
          currentDeadline={parcel.deadline}
          onClose={() => setDeadlineModal(false)}
          onSubmit={async (deadline) => {
            const { parcel: p } = await patchParcelDeadline(parcel.id, deadline);
            onUpdated(p);
            setDeadlineModal(false);
            toast(`Контрольный срок изменён: до ${formatDate(p.deadline!)}`, "success");
          }}
        />
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/** Миниатюра фото: инспектора (Vercel Blob) или жителя (/api/tg-photo/…, с пометкой). */
function PhotoThumb({ url, onOpen }: { url: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const fromResident = url.startsWith("/api/tg-photo/");
  if (failed) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-1 text-center text-[11px] text-slate-500">
        фото недоступно
      </div>
    );
  }
  return (
    <button onClick={onOpen} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={fromResident ? "Фото жителя" : "Фото участка"}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
      {fromResident && (
        <span className="absolute bottom-0 left-0 right-0 bg-black/55 px-1 py-0.5 text-[10px] text-white">от жителя</span>
      )}
    </button>
  );
}
