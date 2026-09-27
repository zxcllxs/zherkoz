"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { parcelCenter, signalToLeaflet } from "@/lib/geo";
import { PARCEL_STATUSES, isOverdue } from "@/lib/status";
import type { Parcel, PublicSignal } from "@/lib/types";
import type { MapFocus } from "./Map";
import { usePolling } from "./usePolling";
import { useNewSignalAlert } from "./useNewSignalAlert";
import { ToastProvider, useToast } from "./Toasts";
import ExportMenu from "./ExportMenu";
import Counters, { type CounterItem, type CounterKey } from "./Counters";
import Filters, { EMPTY_FILTER, applyFilter, type ParcelFilter } from "./Filters";
import ParcelCard from "./ParcelCard";
import ParcelList from "./ParcelList";
import SignalCard from "./SignalCard";
import SignalList from "./SignalList";

const ParcelMap = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-100 text-sm text-slate-500">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      Загрузка карты…
    </div>
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
  const { state, error, refresh, mutate } = usePolling(onError);
  const [tab, setTab] = useState<Tab>("parcels");
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [filter, setFilter] = useState<ParcelFilter>(EMPTY_FILTER);
  const [activeCounter, setActiveCounter] = useState<CounterKey | null>(null);
  const [newSignalsOnly, setNewSignalsOnly] = useState(false);

  const parcels = useMemo(() => state?.parcels ?? [], [state]);
  const signals = useMemo(() => state?.signals ?? [], [state]);
  const now = state ? Date.parse(state.serverTime) : 0;
  const selectedParcel = parcels.find((p) => p.id === selectedParcelId) ?? null;
  const selectedSignal = signals.find((s) => s.id === selectedSignalId) ?? null;

  const overdueOf = useCallback((p: Parcel) => isOverdue(p, now), [now]);
  const filteredParcels = useMemo(() => applyFilter(parcels, filter, overdueOf), [parcels, filter, overdueOf]);
  const visibleSignals = useMemo(
    () => (newSignalsOnly ? signals.filter((s) => s.status === "new") : signals),
    [signals, newSignalsOnly],
  );

  const counts = useMemo(
    () => ({
      all: parcels.length,
      violations: parcels.filter((p) => p.status === "detected" || p.status === "in_progress").length,
      check: parcels.filter((p) => p.status === "check").length,
      newSignals: signals.filter((s) => s.status === "new").length,
      overdue: parcels.filter(overdueOf).length,
    }),
    [parcels, signals, overdueOf],
  );

  const counterItems: CounterItem[] = [
    { key: "all", label: "Всего участков", value: counts.all, color: "#334155" },
    { key: "violations", label: "Нарушения", value: counts.violations, color: "#dc2626" },
    { key: "check", label: "На проверке", value: counts.check, color: "#ca8a04" },
    { key: "newSignals", label: "Новые сигналы", value: counts.newSignals, color: "#f97316" },
    { key: "overdue", label: "Просрочено", value: counts.overdue, color: "#7f1d1d" },
  ];

  const onCounter = (k: CounterKey) => {
    setActiveCounter(k === "all" ? null : k);
    setSelectedParcelId(null);
    setSelectedSignalId(null);
    if (k === "newSignals") {
      setTab("signals");
      setNewSignalsOnly(true);
      return;
    }
    setTab("parcels");
    setNewSignalsOnly(false);
    const base = { ...EMPTY_FILTER, query: filter.query };
    if (k === "violations") setFilter({ ...base, statuses: ["detected", "in_progress"] });
    else if (k === "check") setFilter({ ...base, statuses: ["check"] });
    else if (k === "overdue") setFilter({ ...base, overdueOnly: true });
    else setFilter(EMPTY_FILTER);
  };

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

  const onNewSignal = useCallback((s: PublicSignal) => toast(`Новый сигнал ${s.id}`, "info"), [toast]);
  useNewSignalAlert(state ? signals : null, onNewSignal);

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

  const onFilterChange = (f: ParcelFilter) => {
    setFilter(f);
    setActiveCounter(null);
  };
  const filterActive =
    filter.query.trim() !== "" || filter.overdueOnly || filter.statuses.length !== PARCEL_STATUSES.length;

  const tabBtn = (t: Tab) =>
    `flex-1 border-b-2 px-3 py-2.5 text-sm font-medium ${
      tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-5 py-3">
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
        {state && (
          <div className="flex flex-wrap items-center gap-2">
            <Counters items={counterItems} active={activeCounter} onClick={onCounter} />
            <ExportMenu parcels={parcels} signals={signals} now={now} />
          </div>
        )}
      </header>

      <main className="flex min-h-0 flex-1">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            <button className={tabBtn("parcels")} onClick={() => setTab("parcels")}>
              Участки
            </button>
            <button className={tabBtn("signals")} onClick={() => setTab("signals")}>
              Сигналы{" "}
              {counts.newSignals > 0 && (
                <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs text-white">
                  {counts.newSignals} {counts.newSignals === 1 ? "новый" : "новых"}
                </span>
              )}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!state ? (
              error ? (
                <div className="p-6 text-center text-sm">
                  <p className="mb-1 font-medium text-slate-800">Не удалось загрузить данные</p>
                  <p className="mb-4 text-slate-500">{error}</p>
                  <button
                    onClick={() => refresh()}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                  >
                    Повторить
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-sm text-slate-500">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  Загрузка данных…
                </div>
              )
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
                <>
                  <Filters value={filter} onChange={onFilterChange} />
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
                    <span>
                      Показано {filteredParcels.length} из {parcels.length} · ⏰ просрочено: {counts.overdue}
                    </span>
                    {filterActive && (
                      <button
                        className="text-blue-700 hover:underline"
                        onClick={() => {
                          setFilter(EMPTY_FILTER);
                          setActiveCounter(null);
                        }}
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <ParcelList parcels={filteredParcels} now={now} onSelect={(id) => selectParcel(id, true)} />
                </>
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
              <>
                <label className="flex cursor-pointer items-center gap-1.5 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={newSignalsOnly}
                    onChange={(e) => {
                      setNewSignalsOnly(e.target.checked);
                      setActiveCounter(e.target.checked ? "newSignals" : null);
                    }}
                  />
                  Только новые
                </label>
                <SignalList signals={visibleSignals} onSelect={(id) => selectSignal(id, true)} />
              </>
            )}
          </div>
        </aside>
        <section className="relative min-w-0 flex-1">
          <ParcelMap
            parcels={filteredParcels}
            signals={signals}
            selectedParcelId={selectedParcelId}
            selectedSignalId={selectedSignalId}
            focus={focus}
            now={now}
            onSelectParcel={(id) => selectParcel(id)}
            onSelectSignal={(id) => selectSignal(id)}
          />
        </section>
      </main>
    </div>
  );
}
