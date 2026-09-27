// CSV для Excel: UTF-8 с BOM, разделитель «;» (Excel в русской/казахской локали ждёт его), CRLF.
import { deadlineText, formatDate, formatDateTime } from "./format";
import { PARCEL_STATUS_STYLE, SIGNAL_STATUS_STYLE, VIOLATION_LABEL, isOverdue } from "./status";
import type { Parcel, PublicSignal } from "./types";

const BOM = "﻿";
const SEP = ";";

function cell(v: string | number): string {
  let s = String(v);
  // Защита от формул в Excel (текст жителя может начинаться с = + - @).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: (string | number)[][]): string {
  return BOM + [header, ...rows].map((r) => r.map(cell).join(SEP)).join("\r\n") + "\r\n";
}

/** Число с запятой — так Excel в русской локали распознаёт его как число. */
const num = (n: number, digits: number) => n.toFixed(digits).replace(".", ",");

export function parcelsCsv(parcels: Parcel[], now: number): string {
  return toCsv(
    ["Кадастровый номер", "Целевое назначение", "Площадь, га", "Статус", "Нарушение", "Контрольный срок", "Просрочка"],
    parcels.map((p) => [
      p.cadastralNumber,
      p.purpose,
      num(p.areaHa, 4),
      PARCEL_STATUS_STYLE[p.status].label,
      p.violationType ? VIOLATION_LABEL[p.violationType] : "",
      p.deadline ? formatDate(p.deadline) : "",
      isOverdue(p, now) && p.deadline ? `да, ${deadlineText(p.deadline, now).text}` : "нет",
    ]),
  );
}

export function signalsCsv(signals: PublicSignal[], parcels: Parcel[]): string {
  const cadastral = new Map(parcels.map((p) => [p.id, p.cadastralNumber]));
  return toCsv(
    ["Номер", "Поступил", "Статус", "Описание", "Участок", "Широта", "Долгота", "Фото", "Комментарий инспектора"],
    signals.map((s) => [
      s.id,
      formatDateTime(s.createdAt),
      SIGNAL_STATUS_STYLE[s.status].label,
      s.text,
      s.parcelId ? (cadastral.get(s.parcelId) ?? s.parcelId) : "вне зарегистрированных участков",
      num(s.lat, 6),
      num(s.lng, 6),
      s.photoFileId ? "есть" : "нет",
      s.inspectorNote ?? "",
    ]),
  );
}

export function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
