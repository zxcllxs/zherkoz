"use client";

import { useEffect, useRef } from "react";
import type { PublicSignal } from "@/lib/types";

/** Короткий сигнал через WebAudio (без файлов). Браузер может заблокировать звук до первого клика. */
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // звук необязателен
  }
}

/** Тост + звук при появлении нового сигнала (начиная со второго опроса). */
export function useNewSignalAlert(signals: PublicSignal[] | null, onNew: (s: PublicSignal) => void) {
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!signals) return;
    if (known.current === null) {
      known.current = new Set(signals.map((s) => s.id));
      return;
    }
    const fresh = signals.filter((s) => !known.current!.has(s.id));
    if (fresh.length === 0) return;
    for (const s of fresh) known.current.add(s.id);
    for (const s of [...fresh].reverse()) onNew(s);
    beep();
  }, [signals, onNew]);
}
