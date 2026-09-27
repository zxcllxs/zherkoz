"use client";

import { useState } from "react";
import Modal from "./Modal";
import { APPLICATION_STAGES, APPLICATION_STAGE_LABEL } from "@/lib/status";
import type { Application, ApplicationStage } from "@/lib/types";

export default function AppStageModal({
  app,
  onSubmit,
  onClose,
}: {
  app: Application;
  onSubmit: (v: { stage: ApplicationStage; stageNote: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<ApplicationStage>(app.stage);
  const [note, setNote] = useState(app.stageNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // При смене этапа старое пояснение обычно неактуально — очищаем (возврат к текущему этапу восстанавливает его).
  const pickStage = (s: ApplicationStage) => {
    setStage(s);
    setNote(s === app.stage ? app.stageNote : "");
    setError(null);
  };

  const submit = async () => {
    const stageNote = note.trim();
    if (stage === "rejected" && !stageNote) return setError("При отказе пояснение обязательно — его получит житель");
    if (stage === app.stage && stageNote === app.stageNote) return setError("Ничего не изменилось");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ stage, stageNote });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  };

  return (
    <Modal title={`Этап заявления ${app.trackNumber}`} onClose={onClose}>
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium text-slate-800">Этап</legend>
        <div className="grid gap-2">
          {APPLICATION_STAGES.map((s) => (
            <label
              key={s}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                stage === s ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name="stage" checked={stage === s} onChange={() => pickStage(s)} />
              {APPLICATION_STAGE_LABEL[s]}
              {s === app.stage && <span className="text-xs text-slate-400">(текущий)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mb-1 block text-sm font-medium text-slate-800" htmlFor="stage-note">
        Пояснение для жителя {stage === "rejected" && <span className="text-red-600">*</span>}
      </label>
      <textarea
        id="stage-note"
        value={note}
        maxLength={1000}
        rows={4}
        onChange={(e) => setNote(e.target.value)}
        placeholder={stage === "rejected" ? "Причина отказа и что делать дальше" : "Необязательно"}
        className="mb-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <p className="mb-3 text-xs text-slate-500">
        Жители, проверявшие этот трек-номер в боте, получат уведомление.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="min-h-11 rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="min-h-11 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </Modal>
  );
}
