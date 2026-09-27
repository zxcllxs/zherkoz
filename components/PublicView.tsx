"use client";

import dynamic from "next/dynamic";
import { formatDateTime } from "@/lib/format";
import { PARCEL_STATUS_STYLE } from "@/lib/status";
import type { PublicStats } from "@/lib/public-stats";

const PublicMap = dynamic(() => import("./PublicMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Загрузка карты…</div>,
});

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-2xl font-semibold text-slate-900 sm:text-3xl">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default function PublicView({ stats, botUrl }: { stats: PublicStats; botUrl: string | null }) {
  const days = stats.avgDaysToResolve === null ? "—" : stats.avgDaysToResolve.toFixed(1).replace(".", ",");
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ЖерКөз · г. Тараз</h1>
          <p className="text-sm text-slate-600">Открытые итоги народного контроля за земельными участками</p>
        </div>
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          Демо: тестовые данные
        </span>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={String(stats.totalSignals)} label="Всего сигналов" />
        <Stat value={String(stats.confirmedSignals)} label="Нарушение подтверждено" />
        <Stat value={String(stats.resolvedSignals)} label="Устранено" />
        <Stat
          value={days}
          label="Дней в среднем от сигнала до устранения"
          hint={stats.avgSamples ? `по ${stats.avgSamples} случ. в истории участков` : "пока нет завершённых случаев"}
        />
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="font-medium text-slate-900">Участки, где нарушение устранено или участок возвращён государству</h2>
          <div className="flex gap-3 text-xs text-slate-600">
            {(["resolved", "returned"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: PARCEL_STATUS_STYLE[s].color }} />
                {PARCEL_STATUS_STYLE[s].label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[55dvh] min-h-80">
          {stats.parcels.length ? (
            <PublicMap parcels={stats.parcels} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Пока нет завершённых случаев</div>
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-700">Заметили нарушение на земельном участке? Сообщите через Telegram-бот — это займёт минуту.</p>
        {botUrl ? (
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
          >
            Открыть бота в Telegram
          </a>
        ) : (
          <span className="text-sm text-slate-400">Ссылка на бота не настроена</span>
        )}
      </section>

      <footer className="text-xs text-slate-400">
        Обновлено: {formatDateTime(stats.updatedAt)}. Среднее время считается по истории участков: от записи о поступлении
        сигнала до отметки об устранении. Личные данные жителей не публикуются.
      </footer>
    </div>
  );
}
