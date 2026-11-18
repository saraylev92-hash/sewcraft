"use client";
// Guide builder: writes the same compact JSON schema as editorial content (templates, catalog tools),
// previews it with the real renderers and checks it with the real validator.
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Category, Technique } from "@/lib/types";
import type { ToolCatalog } from "@/lib/normalize";
import { TEMPLATES, type ArgSpec } from "@/lib/templates";
import { downloadJson, guideToProject, newGuideRaw } from "@/lib/localGuides";
import { compressImage, update, useHydrated, useStore } from "@/lib/store";
import { validateProject } from "@/lib/validate";
import { materialNeeds } from "@/lib/needs";
import { toneMap } from "@/lib/color";
import { vars as mkVars } from "@/lib/resolve";
import { fabricAmount } from "@/lib/units";
import StepVisual from "../project/StepVisual";
import LayoutView from "../LayoutView";
import { STAGES } from "../bits";
import { IconAlert, IconCheck, IconDown, IconPlus, IconTrash, IconUp } from "../icons";
import { useLang, useT, type MessageKey } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;
const TABS = ["basics", "supplies", "pieces", "steps", "check"] as const;
const TAB_KEY = { basics: "community.tab.basics", supplies: "community.tab.supplies", pieces: "community.tab.pieces", steps: "community.tab.steps", check: "community.tab.check" } as const satisfies Record<(typeof TABS)[number], MessageKey>;

export default function GuideBuilder({ catalog, techniques, categories }: { catalog: ToolCatalog; techniques: { id: string; name: string }[]; categories: Category[] }) {
  const t = useT();
  const lang = useLang();
  const sp = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const id = sp.get("id");
  const g = useStore((s) => (id ? s.guides[id] : undefined));
  const [tab, setTab] = useState<(typeof TABS)[number]>("basics");

  useEffect(() => {
    if (!hydrated) return;
    if (!id || !g) {
      const raw = newGuideRaw();
      update((s) => { s.guides[raw.id] = { raw, status: "draft", updatedAt: Date.now() }; });
      router.replace(`/community/new?id=${raw.id}`);
    }
  }, [hydrated, id, g, router]);

  const set = (fn: (r: Raw) => void) => {
    if (!id) return;
    update((s) => {
      const gg = s.guides[id];
      if (!gg) return;
      fn(gg.raw);
      gg.updatedAt = Date.now();
      if (gg.status === "shared") gg.status = "draft"; // edits need re-checking before sharing again
    });
  };

  const derived = useMemo(() => {
    if (!g) return null;
    const { project, issues: norm } = guideToProject(g, catalog);
    const issues = [...norm.map((m) => ({ level: "error" as const, rule: "content", message: m })), ...validateProject(project, techniques as Technique[])]
      .filter((i) => !/technically validated|not editorially reviewed/.test(i.message));
    let needs: ReturnType<typeof materialNeeds> = [];
    try { needs = materialNeeds(project); } catch { /* invalid pieces are reported by the validator */ }
    return { project, issues, needs, tones: toneMap(project), vars: (() => { try { return mkVars(project); } catch { return {}; } })() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, catalog, techniques, lang]);

  if (!hydrated || !g || !derived) return <p className="p-10 text-center text-ink-soft">{t("community.opening")}</p>;
  const raw = g.raw;
  const errors = derived.issues.filter((i) => i.level === "error");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/community" className="text-sm text-ink-soft">{t("community.backLink")}</Link>
          <h1 className="font-display text-3xl font-semibold">{raw.title || t("community.newGuide")}</h1>
          <p className="text-sm text-ink-soft">{t("community.savedAuto", { status: g.status === "shared" ? t("community.statusShared") : t("community.statusDraft") })}</p>
        </div>
        <div className="flex gap-2">
          {raw.steps.length > 0 && <Link href={`/community/guide?id=${raw.id}`} className="btn btn-secondary">{t("community.preview")}</Link>}
          <button className="btn btn-primary" onClick={() => setTab("check")}>{errors.length ? t("community.toFix", { n: errors.length }) : t("community.shareBtn")}</button>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line scrollbar-none" role="tablist" aria-label={t("community.sections")}>
        {TABS.map((id2, i) => (
          <button key={id2} role="tab" aria-selected={tab === id2} onClick={() => setTab(id2)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === id2 ? "border-terra" : "border-transparent text-ink-soft"}`}>
            <span className="me-1.5 text-ink-soft">{i + 1}</span>{t(TAB_KEY[id2])}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "basics" && <Basics raw={raw} set={set} categories={categories} />}
        {tab === "supplies" && <Supplies raw={raw} set={set} catalog={catalog} />}
        {tab === "pieces" && <Pieces raw={raw} set={set} derived={derived} />}
        {tab === "steps" && <Steps raw={raw} set={set} derived={derived} techniques={techniques} />}
        {tab === "check" && (
          <section className="max-w-3xl space-y-4">
            <div className={`rounded-2xl p-4 ${errors.length ? "bg-terra-soft" : "bg-sage-soft"}`} role="status">
              <p className="font-semibold">{errors.length ? t(errors.length > 1 ? "community.issuesMany" : "community.issuesOne", { n: errors.length }) : t("community.allPass")}</p>
              <p className="text-sm text-ink-soft">{t("community.rules")}</p>
            </div>
            <ul className="space-y-2">
              {derived.issues.map((i, k) => (
                <li key={k} className={`flex gap-2 rounded-xl p-3 text-sm ${i.level === "error" ? "bg-paper ring-1 ring-terra/40" : "bg-paper ring-1 ring-line"}`}>
                  <IconAlert size={18} className={i.level === "error" ? "text-terra" : "text-mustard"} />
                  <span><strong>{i.level === "error" ? t("community.fix") : t("community.note")}</strong>{i.message}</span>
                </li>
              ))}
            </ul>
            <div className="card space-y-3 p-5">
              <p className="text-sm">{t("community.shareInfo1")}<strong>{t("community.shareInfo2")}</strong>{t("community.shareInfo3")}</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" disabled={errors.length > 0 || !raw.author?.trim()} onClick={() => { update((s) => { s.guides[raw.id].status = "shared"; }); toast(t("community.shared"), { tone: "celebrate" }); router.push("/community"); }}>
                  <IconCheck size={18} />{t("community.shareToCommunity")}
                </button>
                <button className="btn btn-secondary" onClick={() => downloadJson(`${(raw.title || raw.id).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`, raw)}>{t("community.exportFile")}</button>
                {raw.steps.length > 0 && <Link className="btn btn-ghost" href={`/community/guide?id=${raw.id}`}>{t("community.previewReader")}</Link>}
              </div>
              {!raw.author?.trim() && <p className="text-xs text-terra">{t("community.needName")}</p>}
            </div>
          </section>
        )}
      </div>

      <div className="mt-10 flex justify-between">
        <button className="btn btn-ghost" disabled={tab === TABS[0]} onClick={() => setTab(TABS[TABS.indexOf(tab) - 1])}>{t("community.back")}</button>
        <button className="btn btn-secondary" disabled={tab === TABS[TABS.length - 1]} onClick={() => setTab(TABS[TABS.indexOf(tab) + 1])}>{t("community.next")}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ small field helpers
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block text-sm"><span className="mb-1 block font-semibold">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}</label>;
}
const num = (v: string) => (v === "" ? 0 : Number(v));
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

// ------------------------------------------------------------------ 1 Basics
function Basics({ raw, set, categories }: { raw: Raw; set: (fn: (r: Raw) => void) => void; categories: Category[] }) {
  const t = useT();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Field label={t("community.title")}><input className="input" value={raw.title} onChange={(e) => set((r) => void (r.title = e.target.value))} placeholder={t("community.titlePh")} /></Field>
        <Field label={t("community.summary")}><input className="input" value={raw.summary} onChange={(e) => set((r) => void (r.summary = e.target.value))} placeholder={t("community.summaryPh")} /></Field>
        <Field label={t("community.description")}><textarea className="input py-2" rows={4} value={raw.description} onChange={(e) => set((r) => void (r.description = e.target.value))} /></Field>
        <Field label={t("community.displayName")} hint={t("community.displayNameHint")}><input className="input" value={raw.author ?? ""} onChange={(e) => set((r) => void (r.author = e.target.value))} /></Field>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("community.category")}><select className="input" value={raw.category} onChange={(e) => set((r) => void (r.category = e.target.value))}>{categories.filter((c) => c.id !== "beginner").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label={t("community.difficulty")}><select className="input" value={raw.difficulty} onChange={(e) => set((r) => void (r.difficulty = e.target.value))}>{(["beginner", "intermediate", "advanced"] as const).map((d) => <option key={d} value={d}>{t(`community.diff.${d}`)}</option>)}</select></Field>
          <Field label={t("community.timeFrom")}><input className="input" type="number" min={5} value={raw.minutes[0]} onChange={(e) => set((r) => void (r.minutes[0] = num(e.target.value)))} /></Field>
          <Field label={t("community.timeTo")}><input className="input" type="number" min={5} value={raw.minutes[1]} onChange={(e) => set((r) => void (r.minutes[1] = num(e.target.value)))} /></Field>
          <Field label={t("community.costFrom")}><input className="input" type="number" min={0} value={raw.costUSD[0]} onChange={(e) => set((r) => void (r.costUSD[0] = num(e.target.value)))} /></Field>
          <Field label={t("community.costTo")}><input className="input" type="number" min={0} value={raw.costUSD[1]} onChange={(e) => set((r) => void (r.costUSD[1] = num(e.target.value)))} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={raw.machineRequired} onChange={(e) => set((r) => void (r.machineRequired = e.target.checked))} />{t("community.needsMachine")}</label>
        <Field label={t("community.tags")} hint={t("community.tagsHint")}><input className="input" value={(raw.tags ?? []).join(", ")} onChange={(e) => set((r) => void (r.tags = e.target.value.split(",").map((x) => x.trim()).filter(Boolean)))} /></Field>
        <Field label={t("community.cover")} hint={t("community.coverHint")}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {raw.cover && <img src={raw.cover} alt={t("community.coverAlt")} className="h-16 w-20 rounded-lg object-cover" />}
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const d = await compressImage(f, 1000); set((r) => void (r.cover = d)); } }} />
            {raw.cover && <button type="button" className="btn btn-ghost text-sm" onClick={() => set((r) => void delete r.cover)}>{t("community.removeBtn")}</button>}
          </div>
        </Field>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 2 Supplies
function Supplies({ raw, set, catalog }: { raw: Raw; set: (fn: (r: Raw) => void) => void; catalog: ToolCatalog }) {
  const t = useT();
  const toolState = (tid: string) => (raw.tools.includes(tid) ? "required" : raw.tools.includes(`${tid}?`) ? "optional" : "none");
  const setTool = (tid: string, st: string) => set((r) => { r.tools = r.tools.filter((t: string) => t !== tid && t !== `${tid}?`); if (st === "required") r.tools.push(tid); if (st === "optional") r.tools.push(`${tid}?`); });
  const mats = raw.materials.map((m: any, i: number) => ({ m, i })).filter(({ m }: any) => typeof m === "object");
  const hasThread = raw.materials.includes("thread");
  const addMat = (kind: string) => set((r) => {
    let n = 1; while (r.materials.some((m: any) => m?.id === `m${n}`)) n++;
    const base = { id: `m${n}`, name: kind === "fabric" ? t("community.fabric") : kind === "interfacing" ? t("community.interfacingName") : t("community.notion"), kind, required: true, why: "", swatch: kind === "fabric" ? "#9DB09A" : "#E8E0D2" };
    r.materials.push(kind === "fabric" || kind === "interfacing" ? { ...base, recommended: [], layout: { mode: "single", defaultWidth: 112, widths: [112, 140] } } : { ...base, quantity: "" });
  });
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">{t("community.tools")}</h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
          {Object.entries(catalog).map(([tid, tool]) => (
            <li key={tid} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>{tool.name}</span>
              <span className="flex gap-1" role="group" aria-label={t("community.toolNeeded", { name: tool.name })}>
                {(["none", "optional", "required"] as const).map((st) => <button key={st} className="chip chip-toggle !min-h-[32px] !text-xs capitalize" aria-pressed={toolState(tid) === st} onClick={() => setTool(tid, st)}>{st === "none" ? "—" : t(`community.req.${st}`)}</button>)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">{t("community.materials")}</h2>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={hasThread} onChange={(e) => set((r) => { r.materials = r.materials.filter((m: any) => m !== "thread"); if (e.target.checked) r.materials.push("thread"); })} />{t("community.includeThread")}</label>
        <ul className="space-y-3">
          {mats.map(({ m, i }: any) => (
            <li key={m.id} className="card space-y-3 p-4">
              <div className="flex items-center gap-2">
                <input type="color" aria-label={t("community.diagramColour")} value={m.swatch} onChange={(e) => set((r) => void (r.materials[i].swatch = e.target.value))} className="h-10 w-10 cursor-pointer rounded-lg border border-line" />
                <input className="input" aria-label={t("community.materialName")} value={m.name} onChange={(e) => set((r) => void (r.materials[i].name = e.target.value))} />
                <button className="btn-icon shrink-0" aria-label={t("community.remove", { name: m.name })} onClick={() => set((r) => { r.materials.splice(i, 1); })}><IconTrash size={16} /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("community.kind")}><select className="input" value={m.kind} onChange={(e) => set((r) => { const mm = r.materials[i]; mm.kind = e.target.value; if (e.target.value === "fabric" || e.target.value === "interfacing") { mm.layout ??= { mode: "single", defaultWidth: 112, widths: [112, 140] }; } else delete mm.layout; })}>
                  <option value="fabric">{t("community.fabric")}</option><option value="interfacing">{t("community.interfacingBatting")}</option><option value="notion">{t("community.notionOpt")}</option></select></Field>
                <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={m.required} onChange={(e) => set((r) => void (r.materials[i].required = e.target.checked))} />{t("community.required")}</label>
                <Field label={t("community.why")}><input className="input" value={m.why} onChange={(e) => set((r) => void (r.materials[i].why = e.target.value))} /></Field>
                {m.layout ? (
                  <>
                    <Field label={t("community.recommended")} hint={t("community.commaSep")}><input className="input" value={(m.recommended ?? []).join(", ")} onChange={(e) => set((r) => void (r.materials[i].recommended = e.target.value.split(",").map((x) => x.trim()).filter(Boolean)))} /></Field>
                    <Field label={t("community.fabricWidth")}><input className="input" type="number" min={20} value={m.layout.defaultWidth} onChange={(e) => set((r) => { const w = num(e.target.value); r.materials[i].layout.defaultWidth = w; r.materials[i].layout.widths = [w]; })} /></Field>
                    <Field label={t("community.cut")}><select className="input" value={m.layout.mode} onChange={(e) => set((r) => void (r.materials[i].layout.mode = e.target.value))}><option value="single">{t("community.singleLayer")}</option><option value="folded">{t("community.folded")}</option></select></Field>
                  </>
                ) : (
                  <Field label={t("community.quantity")} hint={t("community.quantityHint")}><input className="input" value={m.quantity ?? ""} onChange={(e) => set((r) => void (r.materials[i].quantity = e.target.value))} /></Field>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-secondary text-sm" onClick={() => addMat("fabric")}><IconPlus size={16} />{t("community.fabric")}</button>
          <button className="btn btn-secondary text-sm" onClick={() => addMat("interfacing")}><IconPlus size={16} />{t("community.interfacingBatting")}</button>
          <button className="btn btn-secondary text-sm" onClick={() => addMat("notion")}><IconPlus size={16} />{t("community.notion")}</button>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ 3 Pieces
function Pieces({ raw, set, derived }: { raw: Raw; set: (fn: (r: Raw) => void) => void; derived: any }) {
  const t = useT();
  const fabrics = raw.materials.filter((m: any) => typeof m === "object" && m.layout);
  const add = () => set((r) => {
    let n = 1; while (r.pieces.some((p: any) => p.id === `p${n}`)) n++;
    const mat = fabrics[0];
    r.pieces.push({ id: `p${n}`, name: t("community.defPiece", { n }), materialId: mat?.id ?? "", quantity: 1, width: 20, height: 20, seamAllowance: 1, grain: "lengthwise", color: mat?.swatch ?? "#C9BBA8" });
  });
  const units = useStore((s) => s.profile.units);
  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <h2 className="font-display text-xl font-semibold">{t("community.piecesTitle")}</h2>
        <p className="mb-3 text-sm text-ink-soft">{t("community.piecesIntro1")}<strong>{t("community.piecesIntro2")}</strong>{t("community.piecesIntro3")}</p>
        {!fabrics.length && <p className="rounded-xl bg-terra-soft p-3 text-sm">{t("community.addFabricFirst")}</p>}
        <ul className="space-y-3">
          {raw.pieces.map((p: any, i: number) => (
            <li key={p.id} className="card space-y-3 p-4">
              <div className="flex items-center gap-2">
                <input type="color" aria-label={t("community.pieceColour")} value={p.color} onChange={(e) => set((r) => void (r.pieces[i].color = e.target.value))} className="h-10 w-10 rounded-lg border border-line" />
                <input className="input" aria-label={t("community.pieceName")} value={p.name} onChange={(e) => set((r) => void (r.pieces[i].name = e.target.value))} />
                <button className="btn-icon shrink-0" aria-label={t("community.remove", { name: p.name })} onClick={() => set((r) => { r.pieces.splice(i, 1); r.steps.forEach((s: any) => { s.pieces = (s.pieces ?? []).filter((x: string) => x !== p.id); }); })}><IconTrash size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label={t("community.cutFrom")}><select className="input" value={p.materialId} onChange={(e) => set((r) => void (r.pieces[i].materialId = e.target.value))}>{fabrics.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
                <Field label={t("community.quantity")}><input className="input" type="number" min={1} value={p.quantity} onChange={(e) => set((r) => void (r.pieces[i].quantity = Math.max(1, num(e.target.value))))} /></Field>
                <Field label={t("community.grain")}><select className="input" value={p.grain} onChange={(e) => set((r) => void (r.pieces[i].grain = e.target.value))}><option value="lengthwise">{t("community.lengthwise")}</option><option value="any">{t("community.eitherWay")}</option></select></Field>
                <Field label={t("community.widthCm")}><input className="input" type="number" min={1} step={0.5} value={p.width} onChange={(e) => set((r) => void (r.pieces[i].width = num(e.target.value)))} /></Field>
                <Field label={t("community.heightCm")}><input className="input" type="number" min={1} step={0.5} value={p.height} onChange={(e) => set((r) => void (r.pieces[i].height = num(e.target.value)))} /></Field>
                <Field label={t("community.sa")}><input className="input" type="number" min={0} step={0.1} value={p.seamAllowance} onChange={(e) => set((r) => void (r.pieces[i].seamAllowance = num(e.target.value)))} /></Field>
              </div>
              <Field label={t("community.notesOpt")}><input className="input" value={p.notes ?? ""} onChange={(e) => set((r) => void (r.pieces[i].notes = e.target.value || undefined))} /></Field>
            </li>
          ))}
        </ul>
        <button className="btn btn-secondary mt-3" onClick={add} disabled={!fabrics.length}><IconPlus size={16} />{t("community.addPiece")}</button>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">{t("community.liveLayout")}</h2>
        {derived.needs.map((n: any) => (
          <div key={n.material.id}>
            <p className="mb-1 text-sm font-semibold">{n.fits ? t("community.buy", { name: n.material.name, amount: fabricAmount(n.need.totalCm, units) }) : t("community.noFitWidth", { name: n.material.name })}</p>
            {n.need.layout.placements.length ? <LayoutView layout={n.need.layout} units={units} swatch={n.material.swatch} compact title={t("community.layoutFor", { name: n.material.name })} /> : <p className="text-xs text-ink-soft">{t("community.noPieces")}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ 4 Steps
function Steps({ raw, set, derived, techniques }: { raw: Raw; set: (fn: (r: Raw) => void) => void; derived: any; techniques: { id: string; name: string }[] }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(raw.steps.length ? 0 : null);
  const units = useStore((s) => s.profile.units);
  const add = () => { set((r) => { r.steps.push({ id: `s${Date.now().toString(36)}`, stage: r.steps.at(-1)?.stage ?? "prep", title: "", text: "", visual: { type: "template", name: "press", args: {} } }); }); setOpen(raw.steps.length); };
  const move = (i: number, d: number) => set((r) => { const j = i + d; if (j < 0 || j >= r.steps.length) return; [r.steps[i], r.steps[j]] = [r.steps[j], r.steps[i]]; });
  const toneOptions = [
    ...raw.materials.filter((m: any) => typeof m === "object" && m.kind !== "notion").map((m: any) => ({ id: m.id, name: m.name })),
    ...raw.pieces.map((p: any) => ({ id: p.id, name: t("community.pieceOpt", { name: p.name }) })),
  ];

  return (
    <div className="space-y-3">
      {raw.steps.map((st: any, i: number) => {
        const isOpen = open === i;
        const nstep = derived.project.steps[i];
        return (
          <div key={st.id} className="card overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <button className="flex flex-1 items-center gap-3 text-start" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-beige text-xs font-bold">{i + 1}</span>
                <span className="font-semibold">{st.title || <span className="text-ink-soft">{t("community.untitledStep")}</span>}</span>
                <span className="chip !text-[10px] capitalize">{t(`community.stage.${st.stage as "prep"}`)}</span>
              </button>
              <button className="btn-icon" aria-label={t("community.moveUp")} onClick={() => move(i, -1)}><IconUp size={16} /></button>
              <button className="btn-icon" aria-label={t("community.moveDown")} onClick={() => move(i, 1)}><IconDown size={16} /></button>
              <button className="btn-icon" aria-label={t("community.deleteStep")} onClick={() => set((r) => { r.steps.splice(i, 1); })}><IconTrash size={16} /></button>
            </div>
            {isOpen && (
              <div className="grid gap-5 border-t border-line p-4 lg:grid-cols-[1.1fr_1fr]">
                <div className="space-y-3">
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <Field label={t("community.stage")}><select className="input" value={st.stage} onChange={(e) => set((r) => void (r.steps[i].stage = e.target.value))}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
                    <Field label={t("community.title")}><input className="input" value={st.title} onChange={(e) => set((r) => void (r.steps[i].title = e.target.value))} placeholder={t("community.stepTitlePh")} /></Field>
                  </div>
                  <Field label={t("community.instructions")}><textarea className="input py-2" rows={4} value={st.text} onChange={(e) => set((r) => void (r.steps[i].text = e.target.value))} placeholder={t("community.instructionsPh")} /></Field>
                  <Field label={t("community.beginnerHelp")}><textarea className="input py-2" rows={2} value={st.beginner ?? ""} onChange={(e) => set((r) => void (r.steps[i].beginner = e.target.value || undefined))} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("community.tipsLines")}><textarea className="input py-2" rows={2} value={(st.tips ?? []).join("\n")} onChange={(e) => set((r) => void (r.steps[i].tips = lines(e.target.value)))} /></Field>
                    <Field label={t("community.safetyLines")}><textarea className="input py-2" rows={2} value={(st.warnings ?? []).join("\n")} onChange={(e) => set((r) => void (r.steps[i].warnings = lines(e.target.value)))} /></Field>
                  </div>
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold">{t("community.piecesUsed")}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {raw.pieces.map((p: any) => <button key={p.id} className="chip chip-toggle !min-h-[32px] !text-xs" aria-pressed={(st.pieces ?? []).includes(p.id)} onClick={() => set((r) => { const s = r.steps[i]; s.pieces = (s.pieces ?? []).includes(p.id) ? s.pieces.filter((x: string) => x !== p.id) : [...(s.pieces ?? []), p.id]; })}>{p.name}</button>)}
                      {!raw.pieces.length && <span className="text-xs text-ink-soft">{t("community.addPiecesFirst")}</span>}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold">{t("community.measurements")}</legend>
                    {(st.measurements ?? []).map((m: any, k: number) => (
                      <div key={k} className="mb-2 flex gap-2">
                        <input className="input" aria-label={t("community.measLabel")} value={m.label} onChange={(e) => set((r) => void (r.steps[i].measurements[k].label = e.target.value))} placeholder={t("community.measLabelPh")} />
                        <input className="input !w-24" aria-label={t("community.value")} type="number" step={0.1} value={m.value} onChange={(e) => set((r) => void (r.steps[i].measurements[k].value = num(e.target.value)))} />
                        <select className="input !w-24" aria-label={t("community.unit")} value={m.unit} onChange={(e) => set((r) => void (r.steps[i].measurements[k].unit = e.target.value))}><option value="len">{t("community.unitCm")}</option><option value="mm">{t("community.unitMm")}</option><option value="min">{t("community.unitMin")}</option></select>
                        <button className="btn-icon shrink-0" aria-label={t("community.removeMeas")} onClick={() => set((r) => { r.steps[i].measurements.splice(k, 1); })}><IconTrash size={14} /></button>
                      </div>
                    ))}
                    <button className="btn btn-ghost !min-h-[34px] text-sm" onClick={() => set((r) => { r.steps[i].measurements = [...(r.steps[i].measurements ?? []), { label: "", value: 1, unit: "len" }]; })}><IconPlus size={14} />{t("community.addMeas")}</button>
                  </fieldset>
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold">{t("community.linkTech")}</legend>
                    <select className="input" value="" onChange={(e) => e.target.value && set((r) => { r.steps[i].techniques = [...new Set([...(r.steps[i].techniques ?? []), e.target.value])]; })}>
                      <option value="">{t("community.addTech")}</option>{techniques.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    <div className="mt-1 flex flex-wrap gap-1.5">{(st.techniques ?? []).map((tid: string) => <button key={tid} className="chip !text-xs" onClick={() => set((r) => { r.steps[i].techniques = r.steps[i].techniques.filter((x: string) => x !== tid); })}>{techniques.find((x) => x.id === tid)?.name ?? tid} ×</button>)}</div>
                  </fieldset>
                </div>
                <VisualEditor st={st} i={i} set={set} raw={raw} toneOptions={toneOptions}>
                  {nstep && <div className="card overflow-hidden"><StepVisual step={nstep} tones={derived.tones} vars={derived.vars} units={units} needs={derived.needs} compact legend /></div>}
                </VisualEditor>
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-primary" onClick={add}><IconPlus size={18} />{t("community.addStep")}</button>
    </div>
  );
}

function VisualEditor({ st, i, set, raw, toneOptions, children }: { st: any; i: number; set: (fn: (r: Raw) => void) => void; raw: Raw; toneOptions: { id: string; name: string }[]; children: React.ReactNode }) {
  const t = useT();
  const v = st.visual ?? { type: "missing" };
  const sel = v.type === "template" ? `tpl:${v.name}` : v.type === "layout" ? `layout:${v.materialId}` : v.type;
  const fabrics = raw.materials.filter((m: any) => typeof m === "object" && m.layout);
  const tpl = v.type === "template" ? TEMPLATES[v.name] : null;
  const setArg = (k: string, val: unknown) => set((r) => { r.steps[i].visual.args = { ...(r.steps[i].visual.args ?? {}), [k]: val }; });

  return (
    <div className="space-y-3">
      <Field label={t("community.illustrationField")}>
        <select className="input" value={sel} onChange={(e) => set((r) => {
          const x = e.target.value;
          r.steps[i].visual = x.startsWith("tpl:") ? { type: "template", name: x.slice(4), args: {} } : x.startsWith("layout:") ? { type: "layout", materialId: x.slice(7) } : x === "gallery" ? { type: "gallery" } : x === "photo" ? { type: "photo", src: "" } : { type: "missing" };
        })}>
          <optgroup label={t("community.optLayoutGroup")}>{fabrics.map((m: any) => <option key={m.id} value={`layout:${m.id}`}>{t("community.layoutOpt", { name: m.name })}</option>)}</optgroup>
          <optgroup label={t("community.optTplGroup")}>{Object.entries(TEMPLATES).map(([k, tp]) => <option key={k} value={`tpl:${k}`}>{tp.label}</option>)}</optgroup>
          <option value="photo">{t("community.ownPhoto")}</option>
          <option value="missing">{t("community.noneYet")}</option>
        </select>
      </Field>
      {tpl && (
        <div className="grid gap-2 rounded-xl bg-cream p-3 sm:grid-cols-2">
          <p className="text-xs text-ink-soft sm:col-span-2">{tpl.hint}</p>
          {tpl.args.map((a: ArgSpec) => <ArgInput key={a.key} spec={a} value={v.args?.[a.key]} onChange={(val) => setArg(a.key, val)} toneOptions={toneOptions} />)}
        </div>
      )}
      {v.type === "photo" && (
        <Field label={t("community.photo")} hint={t("community.photoHint")}>
          <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const d = await compressImage(f, 1000); set((r) => void (r.steps[i].visual = { type: "photo", src: d })); } }} />
        </Field>
      )}
      <Field label={t("community.altField")} hint={t("community.altHint")}>
        <input className="input" value={st.alt ?? ""} onChange={(e) => set((r) => void (r.steps[i].alt = e.target.value || undefined))} />
      </Field>
      {(v.type !== "photo" || v.src) && children}
    </div>
  );
}

function ArgInput({ spec, value, onChange, toneOptions }: { spec: ArgSpec; value: unknown; onChange: (v: unknown) => void; toneOptions: { id: string; name: string }[] }) {
  const t = useT();
  const v = value ?? spec.default;
  switch (spec.type) {
    case "tone":
      return <Field label={spec.label}><select className="input" value={String(v ?? "")} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{toneOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>;
    case "tones":
      return (
        <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-semibold">{spec.label}</legend>
          <div className="flex flex-wrap gap-1.5">{toneOptions.map((o) => { const arr = (v as string[]) ?? []; return <button key={o.id} className="chip chip-toggle !min-h-[30px] !text-xs" aria-pressed={arr.includes(o.id)} onClick={() => onChange(arr.includes(o.id) ? arr.filter((x) => x !== o.id) : [...arr, o.id])}>{o.name}</button>; })}</div>
        </fieldset>
      );
    case "bool":
      return <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={Boolean(v)} onChange={(e) => onChange(e.target.checked)} />{spec.label}</label>;
    case "select":
      return <Field label={spec.label}><select className="input" value={String(v ?? "")} onChange={(e) => onChange(e.target.value)}>{spec.options!.map((o) => <option key={o} value={o}>{o || t("community.none")}</option>)}</select></Field>;
    case "expr":
      return <Field label={/\(|columns|rows|number/i.test(spec.label) ? spec.label : t("community.cmSuffix", { label: spec.label })}><input className="input" type="number" step={0.1} value={v === undefined ? "" : String(v)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} /></Field>;
    default:
      return <Field label={spec.label}><input className="input" value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} /></Field>;
  }
}
