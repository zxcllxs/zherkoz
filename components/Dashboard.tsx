"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { Parcel } from "@/lib/types";
import { usePolling } from "./usePolling";
import { ToastProvider, useToast } from "./Toasts";
import ParcelCard from "./ParcelCard";
import ParcelList from "./ParcelList";

const ParcelMap = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">Загрузка карты…</div>
  ),
});

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}

function DashboardInner() {
  const toast = useToast();
  const onError = useCallback((m: string) => toast(m, "error"), [toast]);
  const { state, mutate } = usePolling(onError);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  const parcels = useMemo(() => state?.parcels ?? [], [state]);
  const now = state ? Date.parse(state.serverTime) : 0;
  const selectedParcel = parcels.find((p) => p.id === selectedParcelId) ?? null;

  const onParcelUpdated = useCallback(
    (p: Parcel) => mutate((s) => ({ ...s, parcels: s.parcels.map((x) => (x.id === p.id ? p : x)) })),
    [mutate],
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">
            ЖерКөз <span className="font-normal text-slate-400">·</span>{" "}
            <span className="font-normal text-slate-700">Панель земельного инспектора</span>{" "}
            <span className="font-normal text-slate-400">·</span>{" "}
            <span className="font-normal text-slate-700">г. Тараз</span>
          </h1>
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Демо: тестовые данные
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <aside className="w-[360px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          {!state ? (
            <p className="p-6 text-center text-sm text-slate-500">Загрузка данных…</p>
          ) : selectedParcel ? (
            <ParcelCard
              key={selectedParcel.id}
              parcel={selectedParcel}
              now={now}
              onBack={() => setSelectedParcelId(null)}
              onUpdated={onParcelUpdated}
            />
          ) : (
            <>
              <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Участки ({parcels.length})
              </div>
              <ParcelList parcels={parcels} now={now} onSelect={setSelectedParcelId} />
            </>
          )}
        </aside>
        <section className="relative min-w-0 flex-1">
          <ParcelMap parcels={parcels} selectedParcelId={selectedParcelId} onSelectParcel={setSelectedParcelId} />
        </section>
      </main>
    </div>
  );
}
