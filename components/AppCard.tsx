"use client";

import { useState } from "react";
import { patchApp } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { APPLICATION_STAGE_LABEL, procedureLabel } from "@/lib/status";
import type { Application } from "@/lib/types";
import { AppStageBadge } from "./AppList";
import AppStageModal from "./AppStageModal";
import { useToast } from "./Toasts";

export default function AppCard({
  app,
  onBack,
  onUpdated,
}: {
  app: Application;
  onBack: () => void;
  onUpdated: (a: Application) => void;
}) {
  const toast = useToast();
  const [modal, setModal] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4">
      <button onClick={onBack} className="min-h-11 self-start text-sm text-blue-700 hover:underline">
        ← К списку заявлений
      </button>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Заявление</div>
        <div className="font-mono text-lg font-semibold text-slate-900">{app.trackNumber}</div>
        <div className="mt-2">
          <AppStageBadge stage={app.stage} />
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-slate-500">Процедура</dt>
        <dd className="text-slate-900">{procedureLabel(app.procedure)}</dd>
        <dt className="text-slate-500">Этап</dt>
        <dd className="text-slate-900">{APPLICATION_STAGE_LABEL[app.stage]}</dd>
        <dt className="text-slate-500">Пояснение</dt>
        <dd className="whitespace-pre-wrap text-slate-900">{app.stageNote || "—"}</dd>
        <dt className="text-slate-500">Обновлено</dt>
        <dd className="text-slate-900">{formatDateTime(app.updatedAt)}</dd>
      </dl>
      <button
        onClick={() => setModal(true)}
        className="min-h-11 rounded-lg bg-slate-800 px-4 py-2.5 text-left text-sm font-medium text-white shadow-sm hover:bg-slate-900"
      >
        Изменить этап
      </button>
      {modal && (
        <AppStageModal
          app={app}
          onClose={() => setModal(false)}
          onSubmit={async (v) => {
            const res = await patchApp(app.trackNumber, v);
            onUpdated(res.app);
            setModal(false);
            toast(
              `Этап: ${APPLICATION_STAGE_LABEL[res.app.stage]}. Уведомлено жителей: ${res.notified}`,
              "success",
            );
          }}
        />
      )}
    </div>
  );
}
