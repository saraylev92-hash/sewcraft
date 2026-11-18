"use client";
import { printHref } from "@/lib/paths";
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/types";
import { interpolate } from "@/lib/formula";
import { boltWidth, fabricAmount, len, lenNum, unitSuffix } from "@/lib/units";
import type { useProject } from "@/lib/useProject";
import LayoutView from "../LayoutView";
import UnitToggle from "../UnitToggle";
import StepVisual from "./StepVisual";
import { IconAlert, IconPrint } from "../icons";

export default function CuttingPlan({ p, ps }: { p: Project; ps: ReturnType<typeof useProject> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [showDims, setShowDims] = useState(true);
  const [showSA, setShowSA] = useState(true);
  const { units } = ps;
  const cutSteps = p.steps.filter((s) => s.stage === "cut");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <UnitToggle />
        <button className="chip chip-toggle" aria-pressed={showDims} onClick={() => setShowDims(!showDims)}>Dimensions</button>
        <button className="chip chip-toggle" aria-pressed={showSA} onClick={() => setShowSA(!showSA)}>Seam allowances</button>
        <Link href={printHref(p)} className="btn btn-secondary ml-auto"><IconPrint size={18} />Print pattern</Link>
      </div>

      {/* A. pieces table */}
      <section aria-labelledby="pieces-h">
        <h3 id="pieces-h" className="font-display text-xl font-semibold">Cutting pieces</h3>
        <p className="mt-1 text-sm text-ink-soft">All dimensions are <strong>cut sizes and include seam allowances</strong>. Width runs across the fabric; length runs along the grain (parallel to the selvedge).</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-beige/60 text-xs uppercase tracking-wide text-ink-soft">
              <tr><th className="p-3">Piece</th><th className="p-3">Qty</th><th className="p-3">Width × length</th><th className="p-3">Material</th><th className="p-3">Seam allow.</th><th className="p-3">Grain</th><th className="p-3">Notes</th></tr>
            </thead>
            <tbody>
              {ps.pieces.map((pc) => {
                const mat = p.materials.find((m) => m.id === pc.materialId)!;
                const active = sel === pc.id;
                return (
                  <tr key={pc.id} onClick={() => setSel(active ? null : pc.id)} className={`cursor-pointer border-t border-line ${active ? "bg-terra-soft" : "hover:bg-cream"}`} aria-selected={active}>
                    <td className="p-3 font-semibold"><span className="mr-2 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: pc.color }} />{pc.name}</td>
                    <td className="p-3 tabular-nums">{pc.quantity}</td>
                    <td className="p-3 tabular-nums font-semibold">{lenNum(pc.width, units)} × {lenNum(pc.height, units)} {unitSuffix(units)}</td>
                    <td className="p-3">{mat.name.split("—")[0]}</td>
                    <td className="p-3">{pc.seamAllowance ? len(pc.seamAllowance, units) : "none (folded)"}</td>
                    <td className="p-3">{pc.grain === "any" ? "Either way" : "Lengthwise ↕"}{pc.onFold ? " · on fold" : ""}</td>
                    <td className="p-3 text-ink-soft">{[...(pc.outline ? ["Curved piece — print the pattern (or trace it from the print preview)"] : []), ...(pc.markings ?? []), pc.notes ?? ""].filter(Boolean).map((m) => interpolate(m, ps.vars, (cm) => len(cm, units))).join(". ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* B. layouts */}
      {ps.needs.map((n) => {
        const m = n.material;
        const custom = !m.layout!.widths.includes(n.width);
        const need = n.need;
        const waste = need.layout.fabricArea ? Math.max(0, Math.round((1 - need.layout.piecesArea / need.layout.fabricArea) * 100)) : 0;
        return (
          <section key={m.id} aria-labelledby={`lay-${m.id}`} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 id={`lay-${m.id}`} className="font-display text-xl font-semibold">Layout · {m.name}</h3>
                <p className="text-sm text-ink-soft">Tap a piece to highlight it. Grain arrows run parallel to the selvedge.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <span className="text-ink-soft">Fabric width</span>
                  <select className="input !min-h-[38px] !w-auto" value={custom ? "custom" : n.width} onChange={(e) => e.target.value !== "custom" && ps.setLayout(m.id, { width: Number(e.target.value) })}>
                    {m.layout!.widths.map((w) => <option key={w} value={w}>{boltWidth(w, units)}</option>)}
                    {custom && <option value="custom">{boltWidth(n.width, units)}</option>}
                  </select>
                </label>
                <div className="inline-flex rounded-full border border-line bg-paper p-0.5" role="group" aria-label="Fabric folding">
                  {(["folded", "single"] as const).map((mode) => (
                    <button key={mode} aria-pressed={n.mode === mode} onClick={() => ps.setLayout(m.id, { mode })} className={`min-h-[34px] rounded-full px-3 text-xs font-semibold ${n.mode === mode ? "bg-ink text-cream" : "text-ink-soft"}`}>{mode === "folded" ? "Folded" : "Single layer"}</button>
                  ))}
                </div>
              </div>
            </div>
            {need.layout.overflow.length > 0 && (
              <p className="flex items-start gap-2 rounded-xl bg-terra-soft p-3 text-sm text-[#8a3a22]" role="alert">
                <IconAlert className="mt-0.5 shrink-0" />
                <span>{need.layout.overflow.map((o) => `${o.name} ${o.reason.replace(/(\d+(\.\d+)?) cm/g, (_, a) => len(Number(a), units))}`).join("; ")}. Try a wider fabric, a single-layer layout, or a smaller size.</span>
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <LayoutView layout={need.layout} units={units} swatch={m.swatch} selected={sel} onSelect={setSel} showDims={showDims} showSA={showSA} title={`Cutting layout for ${m.name}`} skin={ps.skins[m.id]} />
              <div className="space-y-3">
                <div className="card p-4">
                  <p className="text-xs uppercase tracking-wide text-ink-soft">Buy</p>
                  <p className="font-display text-3xl font-semibold text-terra">{n.fits ? fabricAmount(need.totalCm, units) : "Doesn’t fit"}</p>
                  {n.autoSwitched && <p className="text-xs text-ink-soft">Switched to {n.mode === "single" ? "single layer" : "folded"} — your size doesn&apos;t fit the usual fold.</p>}
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-soft">Layout length</dt><dd className="tabular-nums">{len(need.layout.lengthUsed, units)}</dd></div>
                    {need.shrinkCm > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Shrinkage</dt><dd className="tabular-nums">+{len(need.shrinkCm, units)}</dd></div>}
                    <div className="flex justify-between"><dt className="text-ink-soft">Safety margin</dt><dd className="tabular-nums">+{len(need.marginCm, units)}</dd></div>
                    {n.fits && <div className="flex justify-between"><dt className="text-ink-soft">Unused (approx.)</dt><dd className="tabular-nums">~{waste}%</dd></div>}
                  </dl>
                </div>
                <p className="text-xs text-ink-soft">Layout is packed automatically from the pattern pieces to reduce waste; it is a good layout, not a guaranteed optimum. If you have less fabric, try the other folding option.</p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-2"><span className="inline-block rounded bg-ink px-1.5 text-[10px] font-bold text-white">cut 2</span>through both layers</li>
                  <li className="flex items-center gap-2"><span className="inline-block rounded bg-terra px-1.5 text-[10px] font-bold text-white">cut 1</span>single layer only</li>
                  <li className="flex items-center gap-2"><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#555" strokeDasharray="3 2" /></svg>stitch line (seam allowance)</li>
                </ul>
              </div>
            </div>
          </section>
        );
      })}

      {/* C. cutting instructions */}
      <section aria-labelledby="cutinst-h">
        <h3 id="cutinst-h" className="font-display text-xl font-semibold">How to cut</h3>
        <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "Wash, dry and press your fabric if appropriate (see Preparation).",
            "Lay the fabric flat on a large table, right sides together for folded layouts, with the grain straight.",
            "Fold the fabric selvedge to selvedge as shown — the fold must be parallel to the selvedges.",
            "Measure and mark each rectangle on the wrong side, measuring from the fold or a straightened edge.",
            "Check each marked rectangle is square: both diagonals must be equal.",
            "Cut carefully along the lines with long, smooth strokes.",
            "Label every piece with chalk or a sticky note before you move on.",
          ].map((t, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-paper p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-beige text-xs font-bold">{i + 1}</span>{t}</li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fbf0d9] p-3 text-sm"><IconAlert className="mt-0.5 shrink-0 text-[#8a6a1f]" />Scissors and rotary blades are very sharp. Cut away from your body, keep fingers clear of the blade path, and close rotary cutters every time you put them down.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {cutSteps.map((s) => (
            <figure key={s.id} className="card p-4">
              <figcaption className="mb-2 font-semibold">{s.title}</figcaption>
              <StepVisual step={s} tones={ps.tones} vars={ps.vars} units={units} needs={ps.needs} skins={ps.skins} compact />
              <p className="mt-2 text-sm text-ink-soft">{s.text}</p>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
