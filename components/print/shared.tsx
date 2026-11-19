"use client";
// Print building blocks shared by guide patterns (PrintPattern) and FreeSewing garment patterns.
import { useEffect, useState } from "react";
import type { MessageKey } from "@/lib/i18n";
import type { planPrint } from "@/lib/printLayout";
import type { Units } from "@/lib/types";
import { len } from "@/lib/units";

export const PAPER = {
  a4: { name: "project.print.paperA4" as MessageKey, w: 210, h: 297 },
  letter: { name: "project.print.paperLetter" as MessageKey, w: 215.9, h: 279.4 },
  a0: { name: "project.print.paperA0" as MessageKey, w: 841, h: 1189 },
} as const;
export const MARGIN = 10; // mm, unprinted margin (most printers need ≥ 5 mm)
export const HEADER = 12; // mm reserved for page label

export type Paper = keyof typeof PAPER;

export function Sheet({ paper, children, className = "", dir }: { paper: { w: number; h: number }; children: React.ReactNode; className?: string; dir?: "ltr" | "rtl" }) {
  return (
    <section dir={dir} className={`sheet relative bg-white shadow-lg ${className}`} style={{ width: `${paper.w}mm`, height: `${paper.h}mm`, breakAfter: "page", overflow: "hidden" }}>
      {children}
    </section>
  );
}

export function Calib({ size, label }: { size: number; label: string }) {
  return (
    <div>
      <div style={{ width: `${size}mm`, height: `${size}mm`, border: "0.4mm solid #2B2622", display: "grid", placeItems: "center", fontSize: "4mm" }}>{label}</div>
    </div>
  );
}

export function navigatorIsUS() {
  return typeof navigator !== "undefined" && navigator.language === "en-US";
}

/** Small map of the page grid for taping the sheets together (not to scale). */
export function AssemblyMap({ plan, outlines }: { plan: ReturnType<typeof planPrint>; outlines?: Map<string, string | undefined> }) {
  const W = plan.cols * plan.tileW, H = plan.rows * plan.tileH;
  const k = Math.min(170 / W, 70 / H);
  return (
    <svg direction="ltr" width={`${W * k}mm`} height={`${H * k}mm`} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: "2mm", display: "block" }}>
      {Array.from({ length: plan.rows }).map((_, r) => Array.from({ length: plan.cols }).map((__, c) => {
        const on = plan.used(r, c);
        return (
          <g key={`${r}-${c}`}>
            <rect x={c * plan.tileW} y={r * plan.tileH} width={plan.tileW} height={plan.tileH} fill={on ? "#fff" : "#f1ede8"} stroke={on ? "#2B2622" : "#d8d0c6"} strokeWidth={0.6 / k} strokeDasharray={on ? undefined : `${2 / k} ${2 / k}`} />
          </g>
        );
      }))}
      {plan.placements.map((pl) => {
        const outline = outlines?.get(pl.id);
        return outline ? (
          <g key={pl.id} transform={`translate(${pl.x},${pl.y}) scale(10)`}><path d={outline} fill="#C0583A" fillOpacity={0.18} stroke="#C0583A" strokeWidth={1.2} vectorEffect="non-scaling-stroke" /></g>
        ) : (
          <rect key={pl.id} x={pl.x} y={pl.y} width={pl.w} height={pl.h} fill="#C0583A" fillOpacity={0.18} stroke="#C0583A" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        );
      })}
      {plan.tiles.map(({ r, c, id }) => (
        <text key={id} x={c * plan.tileW + plan.tileW / 2} y={r * plan.tileH + plan.tileH / 2} fontSize={Math.min(plan.tileW, plan.tileH) * 0.28} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill="#2B2622" fillOpacity={0.7}>{id}</text>
      ))}
    </svg>
  );
}

/** Body/size measurement typed in the user's units; stored in cm and clamped to the pattern's range. */
export function MeasureInput({ label, help, cm, min, max, units, onChange, showRange = true }: { label: string; help?: string; cm: number; min: number; max: number; units: Units; onChange: (cm: number) => void; showRange?: boolean }) {
  const f = units === "imperial" ? 2.54 : 1;
  const shown = (v: number) => String(Math.round((v / f) * (units === "imperial" ? 8 : 10)) / (units === "imperial" ? 8 : 10));
  const [text, setText] = useState(shown(cm));
  useEffect(() => setText(shown(cm)), [cm, units]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return setText(shown(cm));
    const v = Math.min(max, Math.max(min, n * f));
    onChange(Math.round(v * 10) / 10);
    setText(shown(v));
  };
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input inputMode="decimal" className="w-24 rounded-xl border border-line bg-paper px-3 py-2 tabular-nums" value={text}
          onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
        <span className="text-ink-soft">{units === "imperial" ? "in" : "cm"}</span>
      </span>
      {showRange && <span className="block text-[11px] text-ink-soft"><bdi dir="ltr">{len(min, units)} – {len(max, units)}</bdi></span>}
      {help && <span className="block text-[11px] text-ink-soft" dir="auto">{help}</span>}
    </label>
  );
}

