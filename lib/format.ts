// Время отображаем в часовом поясе г. Тараз (UTC+5) независимо от устройства.
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

function shifted(iso: string): Date {
  return new Date(new Date(iso).getTime() + OFFSET_MS);
}

/** ДД.ММ.ГГГГ */
export function formatDate(iso: string): string {
  const d = shifted(iso);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** ДД.ММ.ГГГГ ЧЧ:ММ */
export function formatDateTime(iso: string): string {
  const d = shifted(iso);
  return `${formatDate(iso)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** ГГГГ-ММ-ДД (для input type=date) через N дней от now. */
export function dateInputPlusDays(days: number, now: number = Date.now()): string {
  const d = new Date(now + OFFSET_MS + days * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** ГГГГ-ММ-ДД → конец рабочего дня 18:00 по Таразу. */
export function dateInputToIso(value: string): string {
  return `${value}T18:00:00+05:00`;
}

/** «осталось N дн.» / «просрочено на N дн.» */
export function deadlineText(deadlineIso: string, now: number = Date.now()): { text: string; overdue: boolean } {
  const diff = new Date(deadlineIso).getTime() - now;
  if (diff >= 0) return { text: `осталось ${Math.ceil(diff / DAY_MS)} дн.`, overdue: false };
  return { text: `просрочено на ${Math.ceil(-diff / DAY_MS)} дн.`, overdue: true };
}
