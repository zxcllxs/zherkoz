"use client";

import { useState } from "react";
import Modal from "./Modal";
import { dateInputPlusDays, dateInputToIso, formatDate, isoToDateInput } from "@/lib/format";

export default function DeadlineModal({
  cadastralNumber,
  currentDeadline,
  onSubmit,
  onClose,
}: {
  cadastralNumber: string;
  currentDeadline?: string;
  onSubmit: (deadlineIso: string) => Promise<void>;
  onClose: () => void;
}) {
  const min = dateInputPlusDays(0);
  // Текущий срок, если он ещё не прошёл; иначе — демо-значение +30 дней (как при фиксации нарушения).
  const [date, setDate] = useState(() => {
    const current = currentDeadline ? isoToDateInput(currentDeadline) : "";
    return current && current >= min ? current : dateInputPlusDays(30);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!date) return setError("Укажите дату");
    if (date < min) return setError("Контрольный срок не может быть в прошлом");
    if (currentDeadline && date === isoToDateInput(currentDeadline)) return setError("Срок не изменился");
    setBusy(true);
    setError(null);
    try {
      await onSubmit(dateInputToIso(date));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  };

  return (
    <Modal title="Изменить контрольный срок" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        Участок {cadastralNumber}
        {currentDeadline && <> · текущий срок: {formatDate(currentDeadline)}</>}
      </p>
      <label className="mb-1 block text-sm font-medium text-slate-800" htmlFor="new-deadline">
        Новый срок устранения <span className="text-red-600">*</span>
      </label>
      <input
        id="new-deadline"
        type="date"
        value={date}
        min={min}
        onChange={(e) => setDate(e.target.value)}
        className="mb-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <p className="mb-4 text-xs text-slate-500">Статус участка не изменится. Изменение попадёт в историю.</p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Сохранить срок"}
        </button>
      </div>
    </Modal>
  );
}
