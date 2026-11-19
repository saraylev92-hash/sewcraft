"use client";
// A FreeSewing garment pattern: body measurements → drafted pattern → tiled true-size print.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDesign, MEASUREMENTS, type DesignId } from "@/lib/garments/designs";
import { loadDesign, loadPresets, measurePieces, renderPlanned, type LoadedDesign } from "@/lib/garments/draft";
import { planPrint, tileLabel } from "@/lib/printLayout";
import { update, useStore } from "@/lib/store";
import { len } from "@/lib/units";
import { useLang, useT } from "@/lib/i18n";
import { IconChevronL, IconPrint } from "../icons";
import UnitToggle from "../UnitToggle";
import { AssemblyMap, Calib, HEADER, MARGIN, MeasureInput, navigatorIsUS, PAPER, Sheet, type Paper } from "../print/shared";

type Preset = Awaited<ReturnType<typeof loadPresets>>[number];
const DEFAULT_PRESET = "f38";
const FS_URL = "https://freesewing.eu/";

export default function GarmentPattern({ id }: { id: DesignId }) {
  const design = getDesign(id)!;
  const t = useT();
  const lang = useLang();
  const units = useStore((s) => s.profile.units);
  const body = useStore((s) => s.body);
  const bodyPreset = useStore((s) => s.bodyPreset);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loaded, setLoaded] = useState<LoadedDesign | null>(null);
  const [failed, setFailed] = useState(false);
  const [paper, setPaper] = useState<Paper>("a4");
  const [verified, setVerified] = useState(false);
  const [mode, setMode] = useState<"test" | "all">("all");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [today, setToday] = useState("");

  useEffect(() => {
    let live = true;
    loadDesign(id).then((d) => live && setLoaded(d)).catch(() => live && setFailed(true));
    loadPresets().then((p) => live && setPresets(p)).catch(() => live && setFailed(true));
    if (navigatorIsUS()) setPaper("letter");
    return () => { live = false; };
  }, [id]);
  useEffect(() => setToday(new Date().toLocaleDateString(lang === "he" ? "he-IL" : undefined)), [lang]);

  const base = presets.find((p) => p.id === (bodyPreset ?? DEFAULT_PRESET))?.values ?? presets.find((p) => p.id === DEFAULT_PRESET)?.values;
  const measurements = useMemo(() => {
    if (!base) return null;
    const m: Record<string, number> = {};
    for (const k of design.measurements) m[k] = body?.[k] ?? base[k];
    return m;
  }, [base, body, design.measurements]);
  const custom = !!body && !!base && design.measurements.some((k) => body[k] !== undefined && Math.abs(body[k] - base[k]) > 0.01);

  const drafted = useMemo(() => (loaded && measurements ? measurePieces(loaded, measurements, units) : null), [loaded, measurements, units]);
  const pieces = useMemo(() => drafted?.pieces ?? [], [drafted]);
  const items = useMemo(() => pieces.filter((p) => !excluded.includes(p.id)).map(({ id, w, h }) => ({ id, w, h })), [pieces, excluded]);
  const plans = useMemo(
    () => Object.fromEntries((Object.keys(PAPER) as Paper[]).map((k) => [k, planPrint(items, PAPER[k].w - 2 * MARGIN, PAPER[k].h - 2 * MARGIN - HEADER)])) as Record<Paper, ReturnType<typeof planPrint>>,
    [items],
  );
  const plan = plans[paper];
  const markup = useMemo(() => {
    if (!loaded || !measurements || !pieces.length) return "";
    try {
      return renderPlanned(loaded, measurements, units, pieces, plan);
    } catch {
      return "";
    }
  }, [loaded, measurements, units, pieces, plan]);

  const P = PAPER[paper];
  const homePaper: Paper = paper === "a0" ? (navigatorIsUS() ? "letter" : "a4") : paper;
  const C = PAPER[homePaper];
  const { tileW, tileH } = plan;
  const W = plan.cols * tileW, H = plan.rows * tileH;
  const error = failed || (drafted && (drafted.errors.length > 0 || pieces.length === 0)) || (pieces.length > 0 && !markup && items.length > 0);
  const name = design.name[lang];
  const mLabel = (k: string) => MEASUREMENTS[k]?.[lang] ?? k;
  const mValue = (k: string, v: number) => (MEASUREMENTS[k]?.degrees ? `${Math.round(v * 10) / 10}°` : len(v / 10, units));

  const setMeasure = (k: string, v: number) =>
    update((d) => {
      d.body = { ...(base ?? {}), ...(d.body ?? {}), [k]: v };
      d.bodyPreset ??= DEFAULT_PRESET;
    });
  const applyPreset = (pid: string) => {
    const pr = presets.find((p) => p.id === pid);
    if (pr) update((d) => { d.body = { ...pr.values }; d.bodyPreset = pid; });
  };
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
        @media screen { .print-only { display: none !important; } }
        @media print { .sheet { box-shadow: none !important; margin: 0 !important; } .print-preview { zoom: 1 !important; } ${mode === "test" ? ".pattern-sheet { display: none !important; }" : ""} }`}</style>

      <div className="no-print mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/patterns" className="btn btn-ghost !px-2"><IconChevronL className="rtl:-scale-x-100" />{t("garments.back")}</Link>
          <UnitToggle className="ms-auto" />
        </div>
        <header>
          <h1 className="font-display text-3xl font-semibold">{name}</h1>
          <p className="mt-1 text-ink-soft">{design.blurb[lang]}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span><strong>{t("garments.fabric")}:</strong> {design.fabric[lang]}</span>
            <span>{t("garments.difficulty", { n: design.difficulty })}</span>
            <span>{t("garments.designer", { name: design.designer })}</span>
          </p>
          <p className="mt-2 text-sm text-ink-soft">{t("garments.noGuide")} <a className="font-semibold text-terra underline" href={FS_URL} target="_blank" rel="noreferrer">{t("garments.fsLink")}</a></p>
        </header>

        <section className="card p-4" aria-labelledby="gm-h">
          <h2 id="gm-h" className="font-semibold">{t("garments.measureTitle")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("garments.measureBody")}</p>
          <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{t("garments.preset")}</span>
            <select className="rounded-xl border border-line bg-paper px-3 py-2" value={custom ? "" : (bodyPreset ?? DEFAULT_PRESET)} onChange={(e) => applyPreset(e.target.value)} disabled={!presets.length}>
              {custom && <option value="">{t("garments.presetPick")}</option>}
              <optgroup label={t("garments.groupF")}>
                {presets.filter((p) => p.group === "f").map((p) => <option key={p.id} value={p.id}>{t("garments.presetF", { size: p.size })}</option>)}
              </optgroup>
              <optgroup label={t("garments.groupM")}>
                {presets.filter((p) => p.group === "m").map((p) => <option key={p.id} value={p.id}>{t("garments.presetM", { size: p.size })}</option>)}
              </optgroup>
            </select>
          </label>
          {measurements && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {design.measurements.map((k) => {
                const info = MEASUREMENTS[k];
                const help = lang === "he" ? info?.helpHe : info?.helpEn;
                return info?.degrees ? (
                  <DegreeInput key={k} label={mLabel(k)} help={help} value={measurements[k]} onChange={(v) => setMeasure(k, v)} />
                ) : (
                  <MeasureInput key={k} label={mLabel(k)} help={help} cm={measurements[k] / 10} min={1} max={300} showRange={false} units={units} onChange={(cm) => setMeasure(k, cm * 10)} />
                );
              })}
            </div>
          )}
        </section>

        <section className="card p-4" aria-labelledby="gp-h">
          <h2 id="gp-h" className="font-semibold">{t("garments.preview")}</h2>
          {error ? (
            <p className="mt-2 text-sm font-semibold text-terra" role="alert">{t("garments.error")}</p>
          ) : !markup ? (
            <p className="mt-2 text-sm text-ink-soft" aria-live="polite">{t("garments.loading")}</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">{t("garments.previewNote")} {t("garments.lines")}</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white p-2" dir="ltr">
                <svg className="freesewing block h-auto w-full" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: "70vh" }} role="img" aria-label={name}>
                  <g dangerouslySetInnerHTML={{ __html: markup }} />
                  {plan.tiles.map(({ r, c, id: tid }) => (
                    <g key={tid}>
                      <rect x={c * tileW} y={r * tileH} width={tileW} height={tileH} style={{ fill: "none", stroke: "#9a8f84", strokeOpacity: 0.7, strokeWidth: Math.max(1, W / 500), strokeDasharray: `${W / 120} ${W / 200}` }} />
                      <text x={c * tileW + tileW - 6} y={r * tileH + tileH - 6} textAnchor="end" style={{ fontSize: tileH * 0.1, fill: "#9a8f84", fillOpacity: 0.8, fontWeight: 700, stroke: "none" }}>{tid}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </>
          )}
          {pieces.length > 0 && (
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-semibold">{t("garments.piecesLegend")} <span className="font-normal text-ink-soft">— {t("garments.piecesNote")}</span></legend>
              <div className="flex flex-wrap gap-2">
                {pieces.map((pc) => (
                  <button key={pc.id} className="chip chip-toggle" aria-pressed={!excluded.includes(pc.id)} onClick={() => setExcluded((x) => (x.includes(pc.id) ? x.filter((y) => y !== pc.id) : [...x, pc.id]))}>
                    {pc.name} · {len(pc.w / 10, units)} × {len(pc.h / 10, units)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </section>

        <section className="card p-4" aria-labelledby="gpp-h">
          <h2 id="gpp-h" className="font-semibold">{t("project.print.paperSize")}</h2>
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
            <button className="btn btn-primary mt-3" disabled={!verified || !markup} onClick={() => doPrint("all")}><IconPrint size={18} />{t("project.print.s3Btn")}</button>
          </li>
        </ol>
        <p className="text-xs text-ink-soft">{t("garments.credit", { design: design.name.en, designer: design.designer })}</p>
      </div>

      {/* Print job: only rendered for printing (hidden on screen; the preview above is the on-screen view). */}
      <div className="print-preview print-only mx-auto flex flex-col items-center">
        <Sheet paper={C}>
          <div style={{ padding: `${MARGIN}mm`, fontSize: "3.6mm", lineHeight: 1.35 }} className="text-ink">
            <p style={{ fontSize: "7mm" }} className="font-display font-semibold">{t("garments.coverTitle", { name })}</p>
            <p>{t("project.print.cover", { paper: t(P.name), date: today })}</p>
            <div style={{ display: "flex", gap: "12mm", marginTop: "6mm", alignItems: "flex-end" }}>
              <Calib size={50} label={t("project.print.calib5")} />
              <Calib size={50.8} label="2″ × 2″" />
            </div>
            <p style={{ marginTop: "5mm" }}><strong>{t("project.print.checkScale")}</strong> {t("project.print.checkScaleBody")}</p>
            {measurements && (
              <>
                <p style={{ marginTop: "5mm", fontSize: "4.5mm" }} className="font-semibold">{t("garments.coverMeasurements")}</p>
                <p>{design.measurements.map((k) => `${mLabel(k)} ${mValue(k, measurements[k])}`).join(" · ")}</p>
              </>
            )}
            {plan.tiles.length > 0 && (
              <>
                <p style={{ marginTop: "5mm", fontSize: "4.5mm" }} className="font-semibold">{t("project.print.mapTitle", { n: plan.tiles.length })}</p>
                <AssemblyMap plan={plan} />
              </>
            )}
            <p style={{ marginTop: "5mm" }}>{t("garments.lines")}</p>
            <p style={{ marginTop: "4mm", fontSize: "3.2mm" }}>{t("garments.credit", { design: design.name.en, designer: design.designer })}</p>
          </div>
        </Sheet>

        {markup && plan.tiles.map(({ r, c, id: tileId }, i) => {
          const left = c > 0 && plan.used(r, c - 1) ? tileLabel(r, c - 1) : null;
          const up = r > 0 && plan.used(r - 1, c) ? tileLabel(r - 1, c) : null;
          const box = { position: "absolute" as const, insetInlineStart: `${MARGIN}mm`, top: `${MARGIN + HEADER}mm` };
          return (
            <Sheet key={tileId} paper={P} className="pattern-sheet" dir="ltr">
              <div style={{ position: "absolute", insetInlineStart: `${MARGIN}mm`, top: `${MARGIN}mm`, insetInlineEnd: `${MARGIN}mm`, height: `${HEADER}mm`, fontSize: "3.4mm", display: "flex", justifyContent: "space-between" }}>
                <span><strong>{design.name.en}</strong> · <strong>{t("project.print.pageId", { id: tileId })}</strong> · {t("project.print.pageOf", { i: i + 1, n: plan.tiles.length })}</span>
                <span>{left ? t("project.print.joinLeft", { id: left }) : ""} {up ? t("project.print.joinUp", { id: up }) : ""}</span>
              </div>
              <svg className="freesewing" style={box} width={`${tileW}mm`} height={`${tileH}mm`} viewBox={`${c * tileW} ${r * tileH} ${tileW} ${tileH}`} aria-label={t("project.print.tileAria", { id: tileId })}>
                <g dangerouslySetInnerHTML={{ __html: markup }} />
              </svg>
              <svg style={box} width={`${tileW}mm`} height={`${tileH}mm`} viewBox={`${c * tileW} ${r * tileH} ${tileW} ${tileH}`} aria-hidden="true">
                <rect x={c * tileW} y={r * tileH} width={tileW} height={tileH} fill="none" stroke="#999" strokeWidth={0.3} />
                {c + 1 < plan.cols && plan.used(r, c + 1) && <path d={`M${(c + 1) * tileW},${r * tileH + tileH / 2 - 4} l4,4 l-4,4 l-4,-4 z`} fill="#2B2622" />}
                {left && <path d={`M${c * tileW},${r * tileH + tileH / 2 - 4} l4,4 l-4,4 l-4,-4 z`} fill="#2B2622" />}
                {r + 1 < plan.rows && plan.used(r + 1, c) && <path d={`M${c * tileW + tileW / 2 - 4},${(r + 1) * tileH} l4,-4 l4,4 l-4,4 z`} fill="#2B2622" />}
                {up && <path d={`M${c * tileW + tileW / 2 - 4},${r * tileH} l4,-4 l4,4 l-4,4 z`} fill="#2B2622" />}
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

function DegreeInput({ label, help, value, onChange }: { label: string; help?: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Math.round(value * 10) / 10)), [value]);
  const commit = () => {
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 45) return setText(String(value));
    onChange(n);
  };
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input inputMode="decimal" className="w-24 rounded-xl border border-line bg-paper px-3 py-2 tabular-nums" value={text}
          onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
        <span className="text-ink-soft">°</span>
      </span>
      {help && <span className="block text-[11px] text-ink-soft" dir="auto">{help}</span>}
    </label>
  );
}
