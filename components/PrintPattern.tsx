"use client";
// Printable, tiled, 1:1 pattern pieces. Geometry is drawn in real millimetres (SVG width="…mm"),
// so the only scaling risk is the printer dialog — which the calibration squares verify.
import { projectHref } from "@/lib/paths";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { useProject } from "@/lib/useProject";
import { useLocalizedProject } from "@/lib/useLocalized";
import { interpolate } from "@/lib/formula";
import { dims, fabricAmount, len } from "@/lib/units";
import { useLang, useT } from "@/lib/i18n";
import { IconChevronL, IconPrint } from "./icons";
import UnitToggle from "./UnitToggle";
import { AssemblyMap, Calib, HEADER, MARGIN, MeasureInput, navigatorIsUS, PAPER, Sheet, type Paper } from "./print/shared";
import { planPrint, tileLabel } from "@/lib/printLayout";
import type { ResolvedPiece } from "@/lib/resolve";
import type { Units } from "@/lib/types";


export default function PrintPattern({ project: raw }: { project: Project }) {
  const p = useLocalizedProject(raw);
  const t = useT();
  const lang = useLang();
  const ps = useProject(p);
  const [paper, setPaper] = useState<Paper>("a4");
  const [verified, setVerified] = useState(false);
  const [mode, setMode] = useState<"test" | "all">("all");
  const [chosen, setChosen] = useState<string[]>(p.pieces.map((x) => x.id));

  useEffect(() => {
    if (navigator.language === "en-US") setPaper("letter");
  }, []);
  // Formatted after hydration: the static HTML can't know the reader's locale or today's date.
  const [today, setToday] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString(lang === "he" ? "he-IL" : undefined)), [lang]);

  const P = PAPER[paper];
  // The cover/test page always goes on home-printer paper, even when the pieces go to a copy shop (A0).
  const homePaper: Paper = paper === "a0" ? (navigatorIsUS() ? "letter" : "a4") : paper;
  const C = PAPER[homePaper];

  const items = useMemo(
    () => ps.pieces.filter((pc) => chosen.includes(pc.id)).map((pc) => ({ id: pc.id, w: (pc.onFold ? pc.width / 2 : pc.width) * 10, h: pc.height * 10 })),
    [ps.pieces, chosen],
  );
  const plans = useMemo(
    () => Object.fromEntries((Object.keys(PAPER) as Paper[]).map((k) => [k, planPrint(items, PAPER[k].w - 2 * MARGIN, PAPER[k].h - 2 * MARGIN - HEADER)])) as Record<Paper, ReturnType<typeof planPrint>>,
    [items],
  );
  const plan = plans[paper];
  const { tileW, tileH } = plan;
  const byId = new Map(ps.pieces.map((pc) => [pc.id, pc]));
  const sizeLine = p.params.map((x) => `${x.label} ${len(ps.params[x.id], ps.units)}`).join(" · ");

  const doPrint = (m: "test" | "all") => {
    setMode(m);
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="min-h-screen bg-beige/50">
      <style>{`@page { size: ${homePaper === "a4" ? "A4" : "letter"} portrait; margin: 0; }
        @page tiles { size: ${P.w}mm ${P.h}mm; margin: 0; }
        .pattern-sheet { page: tiles; }
        .print-preview > .sheet:last-child { break-after: auto !important; }
        @media print { .sheet { box-shadow: none !important; margin: 0 !important; } .print-preview { zoom: 1 !important; } ${mode === "test" ? ".pattern-sheet { display: none !important; }" : ""} }`}</style>

      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href={`${projectHref(p)}#cutting`} className="btn btn-ghost !px-2"><IconChevronL className="rtl:-scale-x-100" />{t("project.print.back")}</Link>
          <h1 className="font-display text-xl font-semibold">{t("project.print.title", { title: p.title })}</h1>
          <UnitToggle className="ms-auto" />
        </div>
      </div>

      <div className="no-print mx-auto max-w-5xl space-y-4 px-4 py-6">
        {(p.customizable && p.params.length > 0) || p.sizes.length > 0 ? (
          <section className="card p-4" aria-labelledby="pm-h">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="pm-h" className="font-semibold">{t("project.print.measureTitle")}</h2>
              {ps.custom && <button className="btn btn-ghost !min-h-[32px] text-sm" onClick={ps.resetSize}>{t("project.size.reset")}</button>}
            </div>
            <p className="mt-1 text-sm text-ink-soft">{t("project.print.measureBody")}</p>
            {p.sizes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("project.size.presets")}>
                {p.sizes.map((s) => (
                  <button key={s.id} className="chip chip-toggle" aria-pressed={ps.prefs.sizeId === s.id || (!ps.prefs.sizeId && Object.entries(s.values).every(([k, v]) => ps.params[k] === v))} onClick={() => ps.setSize(s.id)}>{s.label}</button>
                ))}
              </div>
            )}
            {p.customizable && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {p.params.map((prm) => (
                  <MeasureInput key={prm.id} label={prm.label} help={prm.help} cm={ps.params[prm.id]} min={prm.min} max={prm.max} units={ps.units} onChange={(v) => ps.setParam(prm.id, v)} />
                ))}
              </div>
            )}
          </section>
        ) : null}
        <section className="card p-4" aria-labelledby="pp-h">
          <h2 id="pp-h" className="font-semibold">{t("project.print.paperSize")}</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("project.print.paperSize")}>
            {(Object.keys(PAPER) as Paper[]).map((k) => (
              <button key={k} className="chip chip-toggle" aria-pressed={paper === k} onClick={() => setPaper(k)}>
                {t(PAPER[k].name)} · {t(plans[k].tiles.length === 1 ? "project.print.pagesOne" : "project.print.pagesN", { n: plans[k].tiles.length })}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-soft">{t(paper === "a0" ? "project.print.a0Note" : "project.print.homeNote")}</p>
        </section>
        <ol className="grid gap-3 md:grid-cols-3">
          <li className="card p-4">
            <p className="text-xs font-semibold text-terra">{t("project.print.stepKicker", { n: 1 })}</p>
            <p className="font-semibold">{t("project.print.s1Title")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("project.print.s1Pre")}<strong>{t("project.print.s1Strong")}</strong>{t("project.print.s1Post")}</p>
            <button className="btn btn-secondary mt-3" onClick={() => doPrint("test")}><IconPrint size={18} />{t("project.print.s1Btn")}</button>
          </li>
          <li className="card p-4">
            <p className="text-xs font-semibold text-terra">{t("project.print.stepKicker", { n: 2 })}</p>
            <p className="font-semibold">{t("project.print.s2Title")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("project.print.s2Body")}</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={verified} onChange={(e) => setVerified(e.target.checked)} />{t("project.print.s2Check")}</label>
          </li>
          <li className="card p-4">
            <p className="text-xs font-semibold text-terra">{t("project.print.stepKicker", { n: 3 })}</p>
            <p className="font-semibold">{t("project.print.s3Title")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("project.print.s3Body", { n: plan.tiles.length + 1 })}</p>
            <p className="mt-1 text-xs text-ink-soft">{t("project.print.pdfHint")}</p>
            <button className="btn btn-primary mt-3" disabled={!verified} onClick={() => doPrint("all")}><IconPrint size={18} />{t("project.print.s3Btn")}</button>
          </li>
        </ol>
        <fieldset className="card p-4">
          <legend className="sr-only">{t("project.print.piecesLegend")}</legend>
          <p className="mb-2 text-sm font-semibold">{t("project.print.piecesLegend")} <span className="font-normal text-ink-soft">{ps.pieces.some((x) => x.outline) ? t("project.print.piecesCurved") : t("project.print.piecesRect")}</span></p>
          <div className="flex flex-wrap gap-2">
            {ps.pieces.map((pc) => (
              <button key={pc.id} className="chip chip-toggle" aria-pressed={chosen.includes(pc.id)} onClick={() => setChosen((x) => (x.includes(pc.id) ? x.filter((y) => y !== pc.id) : [...x, pc.id]))}>
                {pc.name} · {dims(pc.width, pc.height, ps.units)}
              </button>
            ))}
          </div>
          {ps.custom && <p className="mt-2 text-sm text-terra">{t("project.print.customSize")}</p>}
        </fieldset>
        <p className="text-sm text-ink-soft">{t("project.print.previewNote")}</p>
      </div>

      <div className="print-preview mx-auto flex flex-col items-center gap-6 pb-16" style={{ zoom: paper === "a0" ? 0.18 : 0.5 }}>
        {/* Cover / calibration */}
        <Sheet paper={C}>
          <div style={{ padding: `${MARGIN}mm`, fontSize: "3.6mm", lineHeight: 1.35 }} className="text-ink">
            <p style={{ fontSize: "7mm" }} className="font-display font-semibold">{p.title}</p>
            <p>{t("project.print.cover", { paper: t(P.name), date: today })} {ps.custom ? t("project.print.coverCustom") : ""}</p>
            {sizeLine && <p><strong>{t("project.print.madeFor")}</strong> {sizeLine}</p>}
            <div style={{ display: "flex", gap: "12mm", marginTop: "8mm", alignItems: "flex-end" }}>
              <Calib size={50} label={t("project.print.calib5")} />
              <Calib size={50.8} label="2″ × 2″" />
            </div>
            <p style={{ marginTop: "6mm" }}><strong>{t("project.print.checkScale")}</strong> {t("project.print.checkScaleBody")}</p>
            <p style={{ marginTop: "5mm", fontSize: "4.5mm" }} className="font-semibold">{t("project.print.cuttingList")}</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2mm" }}>
              <thead><tr style={{ textAlign: "start", borderBottom: "0.3mm solid #999" }}><th>{t("project.print.th.piece")}</th><th>{t("project.print.th.cut")}</th><th>{t("project.print.th.size")}</th><th>{t("project.print.th.material")}</th><th>{t("project.print.th.seam")}</th></tr></thead>
              <tbody>
                {ps.pieces.map((pc) => (
                  <tr key={pc.id} style={{ borderBottom: "0.2mm solid #ddd" }}>
                    <td>{pc.name}</td><td>{pc.quantity}</td><td>{dims(pc.width, pc.height, ps.units)}</td>
                    <td>{p.materials.find((m) => m.id === pc.materialId)?.name.split("—")[0]}</td>
                    <td>{pc.seamAllowance ? len(pc.seamAllowance, ps.units) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plan.tiles.length > 0 && (
              <>
                <p style={{ marginTop: "5mm", fontSize: "4.5mm" }} className="font-semibold">{t("project.print.mapTitle", { n: plan.tiles.length })}</p>
                <AssemblyMap plan={plan} outlines={new Map(ps.pieces.map((pc) => [pc.id, pc.outline]))} />
              </>
            )}
            <p style={{ marginTop: "5mm", fontSize: "4.5mm" }} className="font-semibold">{t("project.print.fabric")}</p>
            <ul>{ps.needs.map((n) => <li key={n.material.id}>{t("project.print.fabricLine", { name: n.material.name, amount: fabricAmount(n.need.totalCm, ps.units), width: len(n.width, ps.units), mode: t(n.mode === "folded" ? "project.print.modeFolded" : "project.print.modeSingle") })}</li>)}</ul>
            <p style={{ marginTop: "5mm", fontSize: "3.2mm" }}>{p.review.technicallyValidated ? "" : `${t("project.print.notTested")} `}{t("project.print.rules")} {p.customNote}</p>
          </div>
        </Sheet>

        {plan.tiles.map(({ r, c, id: tileId }, i) => {
          const left = c > 0 && plan.used(r, c - 1) ? tileLabel(r, c - 1) : null;
          const up = r > 0 && plan.used(r - 1, c) ? tileLabel(r - 1, c) : null;
          return (
            <Sheet key={tileId} paper={P} className="pattern-sheet" dir="ltr">
              <div style={{ position: "absolute", insetInlineStart: `${MARGIN}mm`, top: `${MARGIN}mm`, insetInlineEnd: `${MARGIN}mm`, height: `${HEADER}mm`, fontSize: "3.4mm", display: "flex", justifyContent: "space-between" }}>
                <span><strong>{p.title}</strong> · <strong>{t("project.print.pageId", { id: tileId })}</strong> · {t("project.print.pageOf", { i: i + 1, n: plan.tiles.length })}</span>
                <span>{left ? t("project.print.joinLeft", { id: left }) : ""} {up ? t("project.print.joinUp", { id: up }) : ""}</span>
              </div>
              <svg direction="ltr"
                style={{ position: "absolute", insetInlineStart: `${MARGIN}mm`, top: `${MARGIN + HEADER}mm` }}
                width={`${tileW}mm`} height={`${tileH}mm`} viewBox={`${c * tileW} ${r * tileH} ${tileW} ${tileH}`}
                aria-label={t("project.print.tileAria", { id: tileId })}
              >
                <rect x={c * tileW} y={r * tileH} width={tileW} height={tileH} fill="none" stroke="#999" strokeWidth={0.3} />
                {plan.placements.map((pl) => {
                  const pc = byId.get(pl.id);
                  return pc ? <PieceArt key={pl.id} pc={pc} x={pl.x} y={pl.y} tile={{ x0: c * tileW, y0: r * tileH, x1: (c + 1) * tileW, y1: (r + 1) * tileH }} units={ps.units} notes={[...(pc.markings ?? []), pc.notes ?? ""].filter(Boolean).map((m) => interpolate(m, ps.vars, (cm) => len(cm, ps.units)))} t={t} /> : null;
                })}
                {/* alignment diamonds on every edge shared with another printed page */}
                {c + 1 < plan.cols && plan.used(r, c + 1) && <path d={`M${(c + 1) * tileW},${r * tileH + tileH / 2 - 4} l4,4 l-4,4 l-4,-4 z`} fill="#2B2622" />}
                {left && <path d={`M${c * tileW},${r * tileH + tileH / 2 - 4} l4,4 l-4,4 l-4,-4 z`} fill="#2B2622" />}
                {r + 1 < plan.rows && plan.used(r + 1, c) && <path d={`M${c * tileW + tileW / 2 - 4},${(r + 1) * tileH} l4,-4 l4,4 l-4,4 z`} fill="#2B2622" />}
                {up && <path d={`M${c * tileW + tileW / 2 - 4},${r * tileH} l4,-4 l4,4 l-4,4 z`} fill="#2B2622" />}
                {/* 5 cm scale check on every page */}
                <g transform={`translate(${c * tileW + 4}, ${r * tileH + tileH - 8})`}>
                  <rect width={50} height={4} fill="#fff" stroke="#2B2622" strokeWidth={0.3} />
                  <text y={-1.5} fontSize={3}>{t("project.print.check5")}</text>
                </g>
                <text x={c * tileW + tileW - 4} y={r * tileH + tileH - 4} fontSize={10} fontWeight={700} textAnchor="end" fill="#c9bfb4">{tileId}</text>
              </svg>
            </Sheet>
          );
        })}
      </div>
    </div>
  );
}

type TFn = ReturnType<typeof useT>;

/** One pattern piece drawn at true size (mm) with its top-left corner at (x, y). */
function PieceArt({ pc, x, y, tile, units, notes, t }: { pc: ResolvedPiece; x: number; y: number; tile: { x0: number; y0: number; x1: number; y1: number }; units: Units; notes: string[]; t: TFn }) {
  const wmm = (pc.onFold ? pc.width / 2 : pc.width) * 10, hmm = pc.height * 10;
  const sa = pc.seamAllowance * 10;
  const gx = wmm / 2, gy = hmm / 2;
  const gi = Math.min(40, hmm * 0.2);
  // The part of this piece that falls on the current page (piece-local mm). Labels are placed inside it so no
  // text is ever split across two sheets: the full label on the page holding the piece's centre, the name elsewhere.
  const ix0 = Math.max(0, tile.x0 - x), ix1 = Math.min(wmm, tile.x1 - x);
  const iy0 = Math.max(0, tile.y0 - y), iy1 = Math.min(hmm, tile.y1 - y);
  if (ix1 - ix0 <= 0 || iy1 - iy0 <= 0) return null;
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const home = x + gx >= tile.x0 && x + gx < tile.x1 && y + gy >= tile.y0 && y + gy < tile.y1;
  const cutLine = `${t("project.print.cutQty", { n: pc.quantity })}${pc.onFold ? t("project.print.onTheFold") : ""} · ${dims(pc.width, pc.height, units)}${pc.onFold ? t("project.print.opened") : ""} · ${pc.seamAllowance ? t(pc.outline ? "project.print.saIncluded" : "project.print.saDashed", { sa: len(pc.seamAllowance, units) }) : t("project.print.saNone")}`;
  const name = pc.name.toUpperCase();
  // rough text widths in mm (≈0.55 em per glyph) so labels can be kept clear of the page edge
  const half = Math.max(name.length * 8 * 0.6, cutLine.length * 4.5 * 0.52, ...notes.map((n) => n.length * 3.6 * 0.52)) / 2 + 3;
  const grainText = t("project.print.grain");
  const grainW = grainText.length * 4 * 0.55;
  const vertical = wmm < 2 * half && hmm > 2 * half && iy1 - iy0 > 2 * half;
  const tx0 = tile.x0 - x + 4, tx1 = tile.x1 - x - 4; // page edges, piece-local
  const lx = ix1 - ix0 >= 2 * half ? clamp(gx, ix0 + half, ix1 - half) : clamp(gx, tx0 + half, tx1 - half), ly = clamp(gy, iy0 + 22, iy1 - 10 - notes.length * 6);
  const grainOnPage = gx >= ix0 && gx <= ix1;
  return (
    <g transform={`translate(${x},${y})`}>
      {pc.outline ? (
        <>
          <rect x={0} y={0} width={wmm} height={hmm} fill="none" stroke="#bbb" strokeWidth={0.25} strokeDasharray="2 2" />
          <g transform="scale(10)"><path d={pc.outline} fill="#fffaf2" stroke="#2B2622" strokeWidth={0.6} vectorEffect="non-scaling-stroke" /></g>
        </>
      ) : (
        <>
          <rect x={0} y={0} width={wmm} height={hmm} fill="#fffaf2" stroke="#2B2622" strokeWidth={0.6} />
          {sa > 0 && <rect x={pc.onFold ? 0 : sa} y={sa} width={wmm - (pc.onFold ? 1 : 2) * sa} height={hmm - 2 * sa} fill="none" stroke="#C0583A" strokeWidth={0.35} strokeDasharray="3 2" />}
        </>
      )}
      {pc.onFold && (
        <>
          <line x1={0} y1={0} x2={0} y2={hmm} stroke="#4A5744" strokeWidth={1.2} strokeDasharray="8 2 2 2" />
          <text transform={`translate(5,${hmm / 2}) rotate(90)`} fontSize={5} fontWeight={700} textAnchor="middle" fill="#4A5744">{t("project.print.placeOnFold")}</text>
        </>
      )}
      {/* grainline */}
      <line x1={gx} y1={gi} x2={gx} y2={hmm - gi} stroke="#2B2622" strokeWidth={0.5} />
      <path d={`M${gx - 3},${gi + 6} L${gx},${gi} L${gx + 3},${gi + 6}`} fill="none" stroke="#2B2622" strokeWidth={0.5} />
      <path d={`M${gx - 3},${hmm - gi - 6} L${gx},${hmm - gi} L${gx + 3},${hmm - gi - 6}`} fill="none" stroke="#2B2622" strokeWidth={0.5} />
      {grainOnPage && !vertical && (gx + 3 + grainW < ix1 ? (
        <text x={gx + 3} y={clamp(gy + 12, iy0 + 8, iy1 - 4)} fontSize={4} fill="#2B2622">{grainText}</text>
      ) : gx - 3 - grainW > ix0 ? (
        <text x={gx - 3} y={clamp(gy + 12, iy0 + 8, iy1 - 4)} fontSize={4} textAnchor="end" fill="#2B2622">{grainText}</text>
      ) : null)}
      {!home && ix1 - ix0 > name.length * 6 * 0.62 + 8 && iy1 - iy0 > 16 && (
        <text x={(ix0 + ix1) / 2} y={(iy0 + iy1) / 2 - 8} fontSize={6} fontWeight={700} textAnchor="middle" fill="#9a8f84">{name}</text>
      )}
      {home && (vertical ? (
        // narrow strips: run the label along the strip so it doesn't spill onto neighbouring pieces
        <g transform={`translate(${gx - 6 - notes.length * 3},${clamp(gy, iy0 + half, iy1 - half)}) rotate(-90)`}>
          <text x={0} y={0} fontSize={8} fontWeight={700} textAnchor="middle" fill="#2B2622">{name}</text>
          <text x={0} y={7} fontSize={4.5} textAnchor="middle" fill="#2B2622">{cutLine}</text>
          {notes.map((n, i) => <text key={i} x={0} y={13 + i * 6} fontSize={3.6} textAnchor="middle" fill="#6c6158">{n}</text>)}
        </g>
      ) : (<>
      <text x={lx} y={ly - 18} fontSize={8} fontWeight={700} textAnchor="middle" fill="#2B2622">{name}</text>
      <text x={lx} y={ly - 10} fontSize={4.5} textAnchor="middle" fill="#2B2622">{cutLine}</text>
      {notes.map((n, i) => <text key={i} x={lx} y={ly - 3 + i * 6} fontSize={3.6} textAnchor="middle" fill="#6c6158">{n}</text>)}
      </>))}
    </g>
  );
}
