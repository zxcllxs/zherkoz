"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchState } from "@/lib/api";
import type { StateResponse } from "@/lib/types";

const INTERVAL_MS = 4000;

/**
 * Опрос GET /api/state каждые 4 с; пауза, когда вкладка скрыта.
 * Ответы, запрошенные до локальной мутации, отбрасываются (чтобы не откатить свежие данные).
 */
export function usePolling(onError: (msg: string) => void) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutationSeq = useRef(0);
  const inFlight = useRef(false);
  const errorShown = useRef(false);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const seqAtStart = mutationSeq.current;
    try {
      const data = await fetchState();
      if (seqAtStart === mutationSeq.current) setState(data);
      setError(null);
      errorShown.current = false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки данных";
      setError(msg);
      if (!errorShown.current) {
        onErrorRef.current(msg);
        errorShown.current = true; // не спамим тостами при каждом опросе
      }
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  /** Локально применить результат мутации (без ожидания следующего опроса). */
  const mutate = useCallback((fn: (s: StateResponse) => StateResponse) => {
    mutationSeq.current++;
    setState((s) => (s ? fn(s) : s));
  }, []);

  return { state, error, refresh, mutate };
}
