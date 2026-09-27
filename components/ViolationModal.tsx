"use client";

import { useState } from "react";
import Modal from "./Modal";
import { VIOLATION_LABEL } from "@/lib/status";
import { dateInputPlusDays, dateInputToIso } from "@/lib/format";
import type { ViolationType } from "@/lib/types";

export interface ViolationInput {
  violationType: ViolationType;
  deadline: string; // ISO
  comment?: string;
}

export default function ViolationModal({
  title = "Зафиксировать нарушение",
  cadastralNumber,
  initialComment = "",
  onSubmit,
  onClose,
}: {
  title?: string;
  cadastralNumber: string;
  initialComment?: string;
  onSubmit: (v: ViolationInput) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<ViolationType | "">("");
  const [date, setDate] = useState(() => dateInputPlusDays(30));
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!type) return setError("Выберите тип нарушения");
    if (!date) return setError("Укажите контрольный срок");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ violationType: type, deadline: dateInputToIso(date), comment: comment.trim() || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">Участок {cadastralNumber}</p>
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium text-slate-800">
          Тип нарушения <span className="text-red-600">*</span>
        </legend>
        <div className="grid gap-2">
          {(Object.keys(VIOLATION_LABEL) as ViolationType[]).map((v) => (
            <label
              key={v}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                type === v ? "border-red-500 bg-red-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name="vtype" checked={type === v} onChange={() => setType(v)} />
              {VIOLATION_LABEL[v]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mb-1 block text-sm font-medium text-slate-800" htmlFor="deadline">
        Контрольный срок устранения <span className="text-red-600">*</span>
      </label>
      <input
        id="deadline"
        type="date"
        value={date}
        min={dateInputPlusDays(0)}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <p className="mb-4 mt-1 text-xs text-slate-500">
        По умолчанию +30 дней — демо-значение. Срок устанавливает инспектор.
      </p>
      <label className="mb-1 block text-sm font-medium text-slate-800" htmlFor="comment">
        Комментарий
      </label>
      <textarea
        id="comment"
        value={comment}
        maxLength={1000}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Отмена
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Зафиксировать"}
        </button>
      </div>
    </Modal>
  );
}
