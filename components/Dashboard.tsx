"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { parcelCenter, signalToLeaflet } from "@/lib/geo";
import type { Parcel, PublicSignal } from "@/lib/types";
import type { MapFocus } from "./Map";
import { usePolling } from "./usePolling";
import { ToastProvider, useToast } from "./Toasts";
import ParcelCard from "./ParcelCard";
import ParcelList from "./ParcelList";
import SignalCard from "./SignalCard";
import SignalList from "./SignalList";

const ParcelMap = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">Загрузка карты…</div>
  ),
});

type Tab = "parcels" | "signals";

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
  const [tab, setTab] = useState<Tab>("parcels");
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const parcels = useMemo(() => state?.parcels ?? [], [state]);
  const signals = useMemo(() => state?.signals ?? [], [state]);
  const now = state ? Date.parse(state.serverTime) : 0;
  const selectedParcel = parcels.find((p) => p.id === selectedParcelId) ?? null;
  const selectedSignal = signals.find((s) => s.id === selectedSignalId) ?? null;
  const newSignals = signals.filter((s) => s.status === "new").length;

  const selectParcel = useCallback(
    (id: string, fly = false) => {
      setTab("parcels");
      setSelectedSignalId(null);
      setSelectedParcelId(id);
      const p = parcels.find((x) => x.id === id);
      if (fly && p) setFocus({ center: parcelCenter(p), zoom: 18, key: Date.now() });
    },
    [parcels],
  );

  const selectSignal = useCallback(
    (id: string, fly = false) => {
      setTab("signals");
      setSelectedParcelId(null);
      setSelectedSignalId(id);
      const s = signals.find((x) => x.id === id);
      if (fly && s) setFocus({ center: signalToLeaflet(s), zoom: 18, key: Date.now() });
    },
    [signals],
  );

  const onParcelUpdated = useCallback(
    (p: Parcel) => mutate((s) => ({ ...s, parcels: s.parcels.map((x) => (x.id === p.id ? p : x)) })),
    [mutate],
  );

  const onSignalUpdated = useCallback(
    (sig: PublicSignal, p: Parcel | null) =>
      mutate((s) => ({
        ...s,
        signals: s.signals.map((x) => (x.id === sig.id ? sig : x)),
        parcels: p ? s.parcels.map((x) => (x.id === p.id ? p : x)) : s.parcels,
      })),
    [mutate],
  );

  const tabBtn = (t: Tab) =>
    `flex-1 border-b-2 px-3 py-2.5 text-sm font-medium ${
      tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"
    }`;

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
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            <button className={tabBtn("parcels")} onClick={() => setTab("parcels")}>
              Участки
            </button>
            <button className={tabBtn("signals")} onClick={() => setTab("signals")}>
              Сигналы{" "}
              {newSignals > 0 && (
                <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs text-white">
                  {newSignals} {newSignals === 1 ? "новый" : "новых"}
                </span>
              )}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!state ? (
              <p className="p-6 text-center text-sm text-slate-500">Загрузка данных…</p>
            ) : tab === "parcels" ? (
              selectedParcel ? (
                <ParcelCard
                  key={selectedParcel.id}
                  parcel={selectedParcel}
                  now={now}
                  onBack={() => setSelectedParcelId(null)}
                  onUpdated={onParcelUpdated}
                />
              ) : (
                <ParcelList parcels={parcels} now={now} onSelect={(id) => selectParcel(id, true)} />
              )
            ) : selectedSignal ? (
              <SignalCard
                key={selectedSignal.id}
                signal={selectedSignal}
                parcel={parcels.find((p) => p.id === selectedSignal.parcelId) ?? null}
                onBack={() => setSelectedSignalId(null)}
                onOpenParcel={(id) => selectParcel(id, true)}
                onUpdated={onSignalUpdated}
              />
            ) : (
              <SignalList signals={signals} onSelect={(id) => selectSignal(id, true)} />
            )}
          </div>
        </aside>
        <section className="relative min-w-0 flex-1">
          <ParcelMap
            parcels={parcels}
            signals={signals}
            selectedParcelId={selectedParcelId}
            selectedSignalId={selectedSignalId}
            focus={focus}
            onSelectParcel={(id) => selectParcel(id)}
            onSelectSignal={(id) => selectSignal(id)}
          />
        </section>
      </main>
    </div>
  );
}
