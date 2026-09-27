import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSignals, getParcel } from "@/lib/redis";
import { parcelCenter } from "@/lib/geo";
import { buildScheme } from "@/lib/scheme";
import { deadlineText, formatDate, formatDateTime } from "@/lib/format";
import { PARCEL_STATUS_STYLE, SIGNAL_STATUS_STYLE, VIOLATION_LABEL } from "@/lib/status";
import { SOURCE_LABEL, signalPhotoIds, signalReports, signalSource } from "@/lib/signal-utils";
import { tgPhotoUrl } from "@/lib/parcels";
import { toPublicSignal } from "@/lib/signals";
import type { Parcel, PublicSignal } from "@/lib/types";
import ActQr from "@/components/act/ActQr";
import PrintButton from "@/components/act/PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/act/[parcelId]">): Promise<Metadata> {
  const { parcelId } = await params;
  return { title: `Акт обследования · ${parcelId} · ЖерКөз` };
}

interface ActPhoto {
  url: string;
  label: string;
}

/** Все фото: из карточки участка (инспектор/житель) и фото связанных сигналов, ещё не добавленные в участок. */
function collectPhotos(parcel: Parcel, signals: PublicSignal[]): ActPhoto[] {
  const byUrl = new Map<string, string>(); // url → id сигнала
  for (const s of signals) for (const id of signalPhotoIds(s)) byUrl.set(tgPhotoUrl(id), s.id);
  const out: ActPhoto[] = parcel.photos.map((url) => {
    if (!url.startsWith("/api/tg-photo/")) return { url, label: "Фото инспектора" };
    const sid = byUrl.get(url);
    return { url, label: sid ? `Фото жителя (сигнал ${sid})` : "Фото жителя" };
  });
  const seen = new Set(parcel.photos);
  for (const [url, sid] of byUrl) if (!seen.has(url)) out.push({ url, label: `Фото жителя (сигнал ${sid}, в карточку не добавлено)` });
  return out;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="align-top">
      <th className="w-48 border border-slate-300 bg-slate-50 px-2 py-1 text-left font-medium">{label}</th>
      <td className="border border-slate-300 px-2 py-1">{children}</td>
    </tr>
  );
}

export default async function ActPage({ params }: PageProps<"/act/[parcelId]">) {
  const { parcelId } = await params;
  let parcel: Parcel | null = null;
  let signals: PublicSignal[] = [];
  try {
    parcel = await getParcel(parcelId);
    if (parcel) signals = (await getAllSignals()).filter((s) => s.parcelId === parcelId).map(toPublicSignal);
  } catch (e) {
    console.error("[act]", e instanceof Error ? e.message : e);
    return <div className="p-8 text-center text-sm text-slate-600">Данные временно недоступны. Попробуйте обновить страницу.</div>;
  }
  if (!parcel) notFound();

  // Серверный компонент (force-dynamic) рендерится на каждый запрос: время формирования акта — момент запроса.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const [lat, lng] = parcelCenter(parcel);
  const scheme = buildScheme(parcel.geometry, { lat, lng });
  const st = PARCEL_STATUS_STYLE[parcel.status];
  const photos = collectPhotos(parcel, signals);
  const statusColor = st.color;

  return (
    <div className="act-page mx-auto max-w-[210mm] bg-white p-[12mm] text-[13px] leading-snug text-slate-900 shadow print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <a href={`/?parcel=${encodeURIComponent(parcel.id)}`} className="text-sm text-blue-700 hover:underline">
          ← В панель
        </a>
        <PrintButton />
      </div>

      <header className="mb-4 flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-3">
        <div>
          <h1 className="text-lg font-bold">Акт обследования земельного участка</h1>
          <div className="text-sm text-slate-600">(черновик, форма условная)</div>
          <div className="mt-2 text-sm">
            Дата формирования: <b>{formatDateTime(nowIso)}</b> · ЖерКөз, г. Тараз
          </div>
          {parcel.isTest && (
            <div className="mt-2 inline-block rounded border-2 border-red-600 px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-red-600">
              Тестовые данные
            </div>
          )}
        </div>
        <ActQr parcelId={parcel.id} />
      </header>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 font-semibold">1. Сведения об участке</h2>
        <table className="w-full border-collapse">
          <tbody>
            <Row label="Кадастровый номер">
              <span className="font-mono">{parcel.cadastralNumber}</span>
            </Row>
            <Row label="Целевое назначение">{parcel.purpose}</Row>
            <Row label="Площадь">{parcel.areaHa.toFixed(4)} га</Row>
            <Row label="Адрес">{parcel.address || "—"}</Row>
            <Row label="Центроид (WGS 84)">
              {lat.toFixed(6)}, {lng.toFixed(6)} <span className="text-slate-500">(широта, долгота)</span>
            </Row>
            <Row label="Статус">{st.label}</Row>
            <Row label="Тип нарушения">{parcel.violationType ? VIOLATION_LABEL[parcel.violationType] : "—"}</Row>
            <Row label="Контрольный срок">
              {parcel.deadline ? (
                <>
                  {formatDate(parcel.deadline)}
                  {(parcel.status === "detected" || parcel.status === "in_progress") && (
                    <span className="text-slate-600"> ({deadlineText(parcel.deadline, now).text})</span>
                  )}
                </>
              ) : (
                "—"
              )}
            </Row>
          </tbody>
        </table>
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 font-semibold">2. Схема участка</h2>
        <svg
          viewBox={`0 0 ${scheme.width} ${scheme.height}`}
          className="w-full max-w-[140mm] border border-slate-300"
          role="img"
          aria-label="Схема контура участка"
        >
          <rect width={scheme.width} height={scheme.height} fill="#fff" />
          <polygon points={scheme.points} fill={statusColor} fillOpacity={0.15} stroke={statusColor} strokeWidth={2} />
          {/* Стрелка севера */}
          <g transform={`translate(${scheme.width - 28}, 14)`}>
            <polygon points="0,0 8,22 0,17 -8,22" fill="#0f172a" />
            <text x="0" y="36" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">
              С
            </text>
          </g>
          {/* Масштабная линейка */}
          <g transform={`translate(16, ${scheme.height - 16})`}>
            <line x1="0" y1="0" x2={scheme.scaleBar.px} y2="0" stroke="#0f172a" strokeWidth="2" />
            <line x1="0" y1="-5" x2="0" y2="5" stroke="#0f172a" strokeWidth="2" />
            <line x1={scheme.scaleBar.px} y1="-5" x2={scheme.scaleBar.px} y2="5" stroke="#0f172a" strokeWidth="2" />
            <text x={scheme.scaleBar.px / 2} y="-7" textAnchor="middle" fontSize="11" fill="#0f172a">
              {scheme.scaleBar.meters} м
            </text>
          </g>
        </svg>
        <div className="mt-1 text-xs text-slate-500">
          Габариты контура ≈ {scheme.extentM.w.toFixed(0)} × {scheme.extentM.h.toFixed(0)} м. Схема построена по координатам
          реестра, не является чертежом межевания.
        </div>
      </section>

      <section className="mb-4">
        <h2 className="mb-1 font-semibold">3. Фотоматериалы ({photos.length})</h2>
        {photos.length === 0 ? (
          <p className="text-slate-500">Фото отсутствуют.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <figure key={p.url} className="break-inside-avoid border border-slate-300 p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label} className="h-36 w-full object-cover" />
                <figcaption className="mt-1 text-[11px] text-slate-600">
                  Фото {i + 1}. {p.label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className="mb-1 font-semibold">4. Связанные сигналы ({signals.length})</h2>
        {signals.length === 0 ? (
          <p className="text-slate-500">Сигналов по участку нет.</p>
        ) : (
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-slate-50">
                {["№ сигнала", "Дата", "Источник", "Статус", "Жителей сообщили"].map((h) => (
                  <th key={h} className="border border-slate-300 px-2 py-1 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id}>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{s.id}</td>
                  <td className="border border-slate-300 px-2 py-1">{formatDateTime(s.createdAt)}</td>
                  <td className="border border-slate-300 px-2 py-1">{SOURCE_LABEL[signalSource(s)]}</td>
                  <td className="border border-slate-300 px-2 py-1">{SIGNAL_STATUS_STYLE[s.status].label}</td>
                  <td className="border border-slate-300 px-2 py-1">{signalSource(s) === "satellite" ? "—" : signalReports(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-1 font-semibold">5. История действий</h2>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-slate-50">
              {["Дата и время", "Действие", "Комментарий"].map((h) => (
                <th key={h} className="border border-slate-300 px-2 py-1 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parcel.history.map((h, i) => (
              <tr key={`${h.at}-${i}`} className="break-inside-avoid">
                <td className="whitespace-nowrap border border-slate-300 px-2 py-1">{formatDateTime(h.at)}</td>
                <td className="border border-slate-300 px-2 py-1">{h.action}</td>
                <td className="border border-slate-300 px-2 py-1">{h.comment ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="break-inside-avoid pt-4 text-sm">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <div>Инспектор: ______________________________</div>
          <div>Подпись: ______________</div>
          <div>Дата: «____» ____________ 20___ г.</div>
        </div>
      </section>
    </div>
  );
}
