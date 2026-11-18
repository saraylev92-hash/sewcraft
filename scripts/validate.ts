// npm run validate — runs the §17 content rules over every project file and prints cutting summaries.
import fs from "node:fs";
import path from "node:path";
import { validateProject } from "../lib/validate";
import { resolvePieces } from "../lib/resolve";
import { packLayout, fabricNeed } from "../lib/layout";
import type { Technique } from "../lib/types";
import { normalizeProject, type ToolCatalog } from "../lib/normalize";
import { placeholders, type ProjectTranslation } from "../lib/localize";
import type { Project, SceneEl } from "../lib/types";

const root = path.join(process.cwd(), "content");
const techniques: Technique[] = JSON.parse(fs.readFileSync(path.join(root, "techniques.json"), "utf8"));
const catalog: ToolCatalog = JSON.parse(fs.readFileSync(path.join(root, "tools.json"), "utf8"));
let errors = 0;
const files = ["projects", "community"].flatMap((d) => fs.existsSync(path.join(root, d)) ? fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith(".json")).sort().map((f) => [d, f]) : []);
for (const [dir, f] of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, dir, f), "utf8"));
  if (dir === "community") raw.source = "community";
  const { project: p, issues: ni } = normalizeProject(raw, catalog);
  const issues = [...ni.map((m) => ({ level: "error" as const, rule: "content", message: m })), ...validateProject(p, techniques)];
  const heFile = path.join(root, "i18n", "he", dir, f);
  if (fs.existsSync(heFile)) issues.push(...checkTranslation(p, JSON.parse(fs.readFileSync(heFile, "utf8"))));
  errors += issues.filter((i) => i.level === "error").length;
  console.log(`\n${p.title} [${p.review.status}] — ${p.steps.length} steps`);
  for (const i of issues) console.log(`  ${i.level === "error" ? "✗" : "!"} [${i.rule}] ${i.message}`);
  const pcs = resolvePieces(p);
  for (const m of p.materials.filter((m) => m.layout)) {
    const lay = packLayout(pcs.filter((x) => x.materialId === m.id), { fabricWidth: m.layout!.defaultWidth, mode: m.layout!.mode });
    console.log(`  ${m.name}: ${m.layout!.defaultWidth} cm ${m.layout!.mode} → layout ${lay.lengthUsed} cm, buy ${fabricNeed(lay).totalCm} cm`);
  }
}
const orphans = ["projects", "community"].flatMap((d) => {
  const t = path.join(root, "i18n", "he", d);
  return fs.existsSync(t) ? fs.readdirSync(t).filter((f) => !fs.existsSync(path.join(root, d, f))).map((f) => `${d}/${f}`) : [];
});
for (const o of orphans) { errors++; console.log(`\n✗ [i18n] content/i18n/he/${o} has no matching guide`); }
console.log(errors ? `\n${errors} error(s)` : `\nAll ${files.length} projects pass.`);
process.exit(errors ? 1 : 0);

/** Hebrew overlay rules: ids must exist, list lengths match, {placeholders} survive, scene strings exist. */
function checkTranslation(p: Project, tr: ProjectTranslation) {
  const out: { level: "error" | "warning"; rule: string; message: string }[] = [];
  const err = (message: string) => out.push({ level: "error", rule: "i18n", message });
  if (tr.status !== "draft" && tr.status !== "reviewed") err(`status must be "draft" or "reviewed"`);
  const ids = (name: string, have: string[], got?: Record<string, unknown>) => Object.keys(got ?? {}).forEach((k) => { if (!have.includes(k)) err(`${name}.${k}: no such id in the guide`); });
  ids("steps", p.steps.map((s) => s.id), tr.steps);
  ids("materials", p.materials.map((s) => s.id), tr.materials);
  ids("pieces", p.pieces.map((s) => s.id), tr.pieces);
  ids("tools", p.tools.map((s) => s.id), tr.tools);
  ids("params", p.params.map((s) => s.id), tr.params);
  ids("sizes", p.sizes.map((s) => s.id), tr.sizes);
  const len = (where: string, a?: unknown[], b?: unknown[]) => { if (a && (!b || a.length !== b.length)) err(`${where}: has ${a.length} items, English has ${b?.length ?? 0}`); };
  const ph = (where: string, en?: string, he?: string) => { if (he !== undefined && placeholders(en).join() !== placeholders(he).join()) err(`${where}: placeholders ${placeholders(en).join(" ")} vs ${placeholders(he).join(" ")}`); };
  for (const s of p.steps) {
    const o = tr.steps?.[s.id]; if (!o) continue;
    len(`steps.${s.id}.tips`, o.tips, s.tips); len(`steps.${s.id}.warnings`, o.warnings, s.warnings); len(`steps.${s.id}.measurements`, o.measurements, s.measurements);
    ph(`steps.${s.id}.text`, s.text, o.text); ph(`steps.${s.id}.beginner`, s.beginner, o.beginner); ph(`steps.${s.id}.expert`, s.expert, o.expert);
  }
  for (const m of p.materials) {
    const o = tr.materials?.[m.id]; if (!o) continue;
    ph(`materials.${m.id}.quantity`, m.quantity, o.quantity); len(`materials.${m.id}.recommended`, o.recommended, m.recommended); len(`materials.${m.id}.alternatives`, o.alternatives, m.alternatives);
  }
  for (const x of p.pieces) { const o = tr.pieces?.[x.id]; if (o) len(`pieces.${x.id}.markings`, o.markings, x.markings); }
  for (const x of p.tools) { const o = tr.tools?.[x.id]; if (o) len(`tools.${x.id}.substitutes`, o.substitutes, x.substitutes); }
  len("gallery", tr.gallery, p.gallery); len("finished.dims", tr.finished?.dims, p.finished.dims);
  const texts = new Set<string>();
  const collect = (els: SceneEl[]) => els.forEach((e) => { if (e.k === "label") texts.add(e.text); else if ("label" in e && typeof e.label === "string") texts.add(e.label); });
  p.steps.forEach((s) => s.visual.type === "scene" && collect(s.visual.scene.els)); p.gallery.forEach((g) => collect(g.scene.els));
  Object.keys(tr.strings ?? {}).forEach((k) => { if (!texts.has(k)) err(`strings: "${k}" does not appear in any illustration`); });
  return out;
}
