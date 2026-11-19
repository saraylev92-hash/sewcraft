"use client";
// Printable, tiled, 1:1 pattern pieces. Geometry is drawn in real millimetres (SVG width="…mm"),
// so the only scaling risk is the printer dialog — which the calibration squares verify.
import { projectHref } from "@/lib/paths";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import { useProject } from "@/lib/useProject";
import { useLocalizedProject } from "@/lib/useLocalized";
import { interpolate } from "@/lib/formula";
import { dims, fabricAmount, len } from "@/lib/units";
import { useLang, useT, type MessageKey } from "@/lib/i18n";
import { IconChevronL, IconPrint } from "./icons";

const PAPER = {
  a4: { name: "project.print.paperA4" as MessageKey, w: 210, h: 297 },
  letter: { name: "project.print.paperLetter" as MessageKey, w: 215.9, h: 279.4 },
} as const;
const MARGIN = 10; // mm, unprinted margin (most printers need ≥ 5 mm)
const HEADER = 12; // mm reserved for page label

type Paper = keyof typeof PAPER;

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

  const P = PAPER[paper];
  const tileW = P.w - 2 * MARGIN;
  const tileH = P.h - 2 * MARGIN - HEADER;

  const sheets = ps.pieces
    .filter((pc) => chosen.includes(pc.id))
    .flatMap((pc) => {
      const wmm = (pc.onFold ? pc.width / 2 : pc.width) * 10, hmm = pc.height * 10;
      const cols = Math.ceil(wmm / tileW), rows = Math.ceil(hmm / tileH);
      const tiles = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push({ pc, r, c, cols, rows, wmm, hmm });
      return tiles;
    });

  const doPrint = (m: "test" | "all") => {
    setMode(m);
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="min-h-screen bg-beige/50">
      <style>{`@page { size: ${paper === "a4" ? "A4" : "letter"} portrait; margin: 0; }
        @media print { .sheet { box-shadow: none !important; margin: 0 !important; } .print-preview { zoom: 1 !important; } ${mode === "test" ? ".pattern-sheet { display: none !important; }" : ""} }`}</style>

      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href={`${projectHref(p)}#cutting`} className="btn btn-ghost !px-2"><IconChevronL className="rtl:-scale-x-100" />{t("project.print.back")}</Link>
          <h1 className="font-display text-xl font-semibold">{t("project.print.title", { title: p.title })}</h1>
          <div className="ms-auto flex items-center gap-2" role="group" aria-label={t("project.print.paperSize")}>
            {(Object.keys(PAPER) as Paper[]).map((k) => (
              <button key={k} className="chip chip-toggle" aria-pressed={paper === k} onClick={() => setPaper(k)}>{t(PAPER[k].name)}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="no-print mx-auto max-w-5xl space-y-4 px-4 py-6">
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
            <p className="mt-1 text-sm text-ink-soft">{t("project.print.s3Body", { n: sheets.length + 1 })}</p>
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

      <div className="print-preview mx-auto flex flex-col items-center gap-6 pb-16" style={{ zoom: 0.5 }}>
        {/* Cover / calibration */}
        <Sheet paper={P}>
          <div style={{ padding: `${MARGIN}mm`, fontSize: "3.6mm", lineHeight: 1.35 }} className="text-ink">
            <p style={{ fontSize: "7mm" }} className="font-display font-semibold">{p.title}</p>
            <p>{t("project.print.cover", { paper: t(P.name), date: new Date().toLocaleDateString(lang === "he" ? "he-IL" : undefined) })} {ps.custom ? t("project.print.coverCustom") : ""}</p>
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
            <p style={{ marginTop: "5mm", fontSize: "4.5mm" }} className="font-semibold">{t("project.print.fabric")}</p>
            <ul>{ps.needs.map((n) => <li key={n.material.id}>{t("project.print.fabricLine", { name: n.material.name, amount: fabricAmount(n.need.totalCm, ps.units), width: len(n.width, ps.units), mode: t(n.mode === "folded" ? "project.print.modeFolded" : "project.print.modeSingle") })}</li>)}</ul>
            <p style={{ marginTop: "5mm", fontSize: "3.2mm" }}>{p.review.technicallyValidated ? "" : `${t("project.print.notTested")} `}{t("project.print.rules")} {p.customNote}</p>
          </div>
        </Sheet>

        {sheets.map(({ pc, r, c, cols, rows, wmm, hmm }) => {
          const tileId = `${String.fromCharCode(65 + c)}${r + 1}`;
          const sa = pc.seamAllowance * 10;
          const gx = wmm / 2, gy = hmm / 2;
          const notes = [...(pc.markings ?? []), pc.notes ?? ""].filter(Boolean).map((m) => interpolate(m, ps.vars, (cm) => len(cm, ps.units)));
          return (
            <Sheet key={`${pc.id}-${tileId}`} paper={P} className="pattern-sheet" dir="ltr">
              <div style={{ position: "absolute", insetInlineStart: `${MARGIN}mm`, top: `${MARGIN}mm`, insetInlineEnd: `${MARGIN}mm`, height: `${HEADER}mm`, fontSize: "3.4mm", display: "flex", justifyContent: "space-between" }}>
                <span><strong>{p.title}</strong> · {pc.name} · {t("project.print.page", { id: tileId, cols, rows })}</span>
                <span>{c > 0 ? t("project.print.joinLeft", { id: `${String.fromCharCode(64 + c)}${r + 1}` }) : ""} {r > 0 ? t("project.print.joinUp", { id: `${String.fromCharCode(65 + c)}${r}` }) : ""}</span>
              </div>
              <svg direction="ltr"
                style={{ position: "absolute", insetInlineStart: `${MARGIN}mm`, top: `${MARGIN + HEADER}mm` }}
                width={`${tileW}mm`} height={`${tileH}mm`} viewBox={`${c * tileW} ${r * tileH} ${tileW} ${tileH}`}
                aria-label={t("project.print.tileAria", { name: pc.name, id: tileId })}
              >
                <rect x={c * tileW} y={r * tileH} width={tileW} height={tileH} fill="none" stroke="#999" strokeWidth={0.3} />
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
                <line x1={gx} y1={Math.min(40, hmm * 0.2)} x2={gx} y2={hmm - Math.min(40, hmm * 0.2)} stroke="#2B2622" strokeWidth={0.5} />
                <path d={`M${gx - 3},${Math.min(40, hmm * 0.2) + 6} L${gx},${Math.min(40, hmm * 0.2)} L${gx + 3},${Math.min(40, hmm * 0.2) + 6}`} fill="none" stroke="#2B2622" strokeWidth={0.5} />
                <path d={`M${gx - 3},${hmm - Math.min(40, hmm * 0.2) - 6} L${gx},${hmm - Math.min(40, hmm * 0.2)} L${gx + 3},${hmm - Math.min(40, hmm * 0.2) - 6}`} fill="none" stroke="#2B2622" strokeWidth={0.5} />
                <text x={gx + 3} y={gy} fontSize={4} fill="#2B2622">{t("project.print.grain")}</text>
                <text x={gx} y={gy - 18} fontSize={8} fontWeight={700} textAnchor="middle" fill="#2B2622">{pc.name.toUpperCase()}</text>
                <text x={gx} y={gy - 10} fontSize={4.5} textAnchor="middle" fill="#2B2622">{t("project.print.cutQty", { n: pc.quantity })}{pc.onFold ? t("project.print.onTheFold") : ""} · {dims(pc.width, pc.height, ps.units)}{pc.onFold ? t("project.print.opened") : ""} · {pc.seamAllowance ? t(pc.outline ? "project.print.saIncluded" : "project.print.saDashed", { sa: len(pc.seamAllowance, ps.units) }) : t("project.print.saNone")}</text>
                {notes.map((n, i) => <text key={i} x={gx} y={gy + 10 + i * 6} fontSize={3.6} textAnchor="middle" fill="#6c6158">{n}</text>)}
                {/* alignment diamonds on every internal tile edge */}
                {Array.from({ length: cols - 1 }).map((_, i) => Array.from({ length: rows }).map((__, j) => (
                  <path key={`v${i}-${j}`} d={`M${(i + 1) * tileW},${j * tileH + tileH / 2 - 4} l4,4 l-4,4 l-4,-4 z`} fill="#2B2622" />
                )))}
                {Array.from({ length: rows - 1 }).map((_, j) => Array.from({ length: cols }).map((__, i) => (
                  <path key={`h${i}-${j}`} d={`M${i * tileW + tileW / 2 - 4},${(j + 1) * tileH} l4,-4 l4,4 l-4,4 z`} fill="#2B2622" />
                )))}
                {/* 5 cm scale check on every page */}
                <g transform={`translate(${c * tileW + 4}, ${r * tileH + tileH - 8})`}>
                  <rect width={50} height={4} fill="none" stroke="#2B2622" strokeWidth={0.3} />
                  <text y={-1.5} fontSize={3}>{t("project.print.check5")}</text>
                </g>
              </svg>
            </Sheet>
          );
        })}
      </div>
    </div>
  );
}

function Sheet({ paper, children, className = "", dir }: { paper: { w: number; h: number }; children: React.ReactNode; className?: string; dir?: "ltr" | "rtl" }) {
  return (
    <section dir={dir} className={`sheet relative bg-white shadow-lg ${className}`} style={{ width: `${paper.w}mm`, height: `${paper.h}mm`, breakAfter: "page", overflow: "hidden" }}>
      {children}
    </section>
  );
}

function Calib({ size, label }: { size: number; label: string }) {
  return (
    <div>
      <div style={{ width: `${size}mm`, height: `${size}mm`, border: "0.4mm solid #2B2622", display: "grid", placeItems: "center", fontSize: "4mm" }}>{label}</div>
    </div>
  );
}
