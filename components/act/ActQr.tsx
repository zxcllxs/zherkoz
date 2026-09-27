"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR со ссылкой на панель с открытой карточкой участка (генерируется в браузере). */
export default function ActQr({ parcelId }: { parcelId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const link = `${window.location.origin}/?parcel=${encodeURIComponent(parcelId)}`;
    QRCode.toDataURL(link, { margin: 1, width: 240, errorCorrectionLevel: "M" })
      .then((data) => {
        setUrl(link);
        setSrc(data);
      })
      .catch(() => setUrl(link));
  }, [parcelId]);
  return (
    <div className="flex flex-col items-center gap-1">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR-код: участок в панели инспектора" className="h-28 w-28" />
      ) : (
        <div className="h-28 w-28 bg-slate-100" />
      )}
      <div className="max-w-[9rem] break-all text-center text-[9px] leading-tight text-slate-500">{url}</div>
    </div>
  );
}
