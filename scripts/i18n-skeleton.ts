// npx tsx scripts/i18n-skeleton.ts 06-scrunchie.json > content/i18n/he/projects/06-scrunchie.json
// Prints a translation overlay pre-filled with the guide's ENGLISH text, keyed by id (see lib/localize.ts).
// Replace every English value with Hebrew; keep keys, array lengths and {placeholders} unchanged.
import fs from "node:fs";
import path from "node:path";
import { normalizeProject, type ToolCatalog } from "../lib/normalize";
import type { ProjectTranslation } from "../lib/localize";
import type { SceneEl } from "../lib/types";

const file = process.argv[2];
const dir = process.argv[3] ?? "projects";
const root = path.join(process.cwd(), "content");
const catalog: ToolCatalog = JSON.parse(fs.readFileSync(path.join(root, "tools.json"), "utf8"));
const raw = JSON.parse(fs.readFileSync(path.join(root, dir, file), "utf8"));
const { project: p } = normalizeProject(raw, catalog);

const strings: Record<string, string> = {};
const collect = (els: SceneEl[]) => els.forEach((e) => {
  if (e.k === "label" && /[A-Za-z]/.test(e.text)) strings[e.text] = e.text;
  else if ("label" in e && typeof e.label === "string" && /[A-Za-z]/.test(e.label)) strings[e.label] = e.label;
});
p.steps.forEach((s) => {
  if (s.visual.type !== "scene") return;
  collect(s.visual.scene.els);
  s.visual.frames?.forEach((f) => { collect(f.els); strings[f.caption] = f.caption; });
});
p.gallery.forEach((g) => collect(g.scene.els));

const def = <T,>(o: T) => JSON.parse(JSON.stringify(o)) as T; // drops undefined
const out: ProjectTranslation = def({
  status: "draft",
  title: p.title, summary: p.summary, description: p.description, customNote: p.customNote || undefined, reviewNote: p.review.note,
  finished: { label: p.finished.label, dims: p.finished.dims.map((d) => d.label) },
  params: p.params.length ? Object.fromEntries(p.params.map((x) => [x.id, { label: x.label, help: x.help }])) : undefined,
  sizes: p.sizes.length ? Object.fromEntries(p.sizes.map((x) => [x.id, x.label])) : undefined,
  tools: Object.fromEntries(p.tools.map((x) => [x.id, { name: x.name, why: x.why, substitutes: x.substitutes }])),
  materials: Object.fromEntries(p.materials.map((x) => [x.id, { name: x.name, why: x.why, quantity: x.quantity, weight: x.weight, recommended: x.recommended, alternatives: x.alternatives }])),
  pieces: Object.fromEntries(p.pieces.map((x) => [x.id, { name: x.name, notes: x.notes, markings: x.markings }])),
  steps: Object.fromEntries(p.steps.map((s) => [s.id, { title: s.title, text: s.text, beginner: s.beginner, expert: s.expert, tips: s.tips, warnings: s.warnings, alt: s.alt, measurements: s.measurements?.map((m) => m.label) }])),
  gallery: p.gallery.map((g) => g.label),
  strings,
});
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
