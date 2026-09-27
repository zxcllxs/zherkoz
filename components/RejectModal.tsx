"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function RejectModal({
  signalId,
  onSubmit,
  onClose,
}: {
  signalId: string;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) return setError("Причина обязательна — её получит житель");
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  };

  return (
    <Modal title={`Отклонить сигнал ${signalId}`} onClose={onClose}>
      <label className="mb-1 block text-sm font-medium text-slate-800" htmlFor="reason">
        Причина <span className="text-red-600">*</span>
      </label>
      <textarea
        id="reason"
        value={reason}
        maxLength={1000}
        rows={4}
        autoFocus
        onChange={(e) => setReason(e.target.value)}
        placeholder="Например: на участке ведётся разрешённое строительство"
        className="mb-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <p className="mb-3 text-xs text-slate-500">Текст причины будет отправлен жителю в Telegram.</p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Отклонить"}
        </button>
      </div>
    </Modal>
  );
}
