"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { IconTimer } from "../icons";

export default function Timer({ defaultMin }: { defaultMin?: number }) {
  const t = useT();
  const [min, setMin] = useState(defaultMin ?? 5);
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const end = useRef(0);

  useEffect(() => { setMin(defaultMin ?? 5); setLeft(null); setRunning(false); }, [defaultMin]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((end.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        setRunning(false);
        try {
          const ctx = new AudioContext();
          [0, 0.3, 0.6].forEach((d) => { const o = ctx.createOscillator(); o.frequency.value = 880; o.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.15); });
        } catch { /* no audio */ }
        navigator.vibrate?.([200, 100, 200]);
      }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const shown = left ?? min * 60;
  const mm = String(Math.floor(shown / 60)).padStart(2, "0"), ss = String(shown % 60).padStart(2, "0");

  return (
    <div className="card p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><IconTimer size={18} />{t("sew.timer.title")} {defaultMin ? <span className="chip !text-[10px]">{t("sew.timer.suggested")}</span> : <span className="text-xs font-normal text-ink-soft">{t("sew.timer.optional")}</span>}</p>
      <div className="flex items-center gap-2">
        <span className={`font-display text-3xl tabular-nums ${left === 0 ? "text-terra" : ""}`} aria-live="polite">{mm}:{ss}</span>
        {!running && left === null && (
          <input type="number" min={1} max={120} value={min} onChange={(e) => setMin(Math.max(1, Number(e.target.value)))} className="input !min-h-[38px] !w-16" aria-label={t("sew.timer.minutes")} />
        )}
        <div className="ms-auto flex gap-1">
          <button className="btn btn-secondary !min-h-[38px] text-sm" onClick={() => {
            if (running) { setRunning(false); return; }
            end.current = Date.now() + (left && left > 0 ? left : min * 60) * 1000;
            setRunning(true);
          }}>{running ? t("sew.timer.pause") : left ? t("sew.timer.resume") : t("sew.timer.start")}</button>
          {left !== null && <button className="btn btn-ghost !min-h-[38px] text-sm" onClick={() => { setRunning(false); setLeft(null); }}>{t("sew.timer.reset")}</button>}
        </div>
      </div>
    </div>
  );
}
