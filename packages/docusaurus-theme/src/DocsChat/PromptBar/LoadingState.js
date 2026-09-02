// Licznik czasu pracy asystenta (wzorzec BUI „Loading State"): tyka co 200 ms, tylko gdy tura
// trwa; aria-hidden — czytniki dostają jeden komunikat role="status" z panelu, nie zmieniającą
// się co 200 ms liczbę. Czas liczony od `startedAt` tury (Date.now() z hooka), nie od montażu.
import React, { useEffect, useState } from "react";
import styles from "./styles.module.css";
import { formatSeconds } from "../lib/format.mjs";

export const ELAPSED_TICK_MS = 200;

/** @param {number|null|undefined} startedAt @param {boolean} running */
export function useElapsedMs(startedAt, running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS);
    return () => clearInterval(id);
  }, [running, startedAt]);
  if (!running || !Number.isFinite(startedAt)) return null;
  return Math.max(0, now - startedAt);
}

/**
 * @param {{ startedAt: number|null|undefined, running: boolean, locale: string, copy: any }} props
 */
export default function LoadingState({ startedAt, running, locale, copy }) {
  const elapsed = useElapsedMs(startedAt, running);
  if (elapsed === null) return null;
  return (
    <span className={styles.elapsed} aria-hidden="true">
      {copy.elapsed.replace("{seconds}", formatSeconds(elapsed, locale))}
    </span>
  );
}
