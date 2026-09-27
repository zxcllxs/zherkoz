"use client";

import { useEffect } from "react";

export default function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/85 p-6" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Фото" className="max-h-full max-w-full rounded shadow-2xl" />
      <button className="absolute right-5 top-4 text-3xl text-white" aria-label="Закрыть">
        ×
      </button>
    </div>
  );
}
