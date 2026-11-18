// Guide CONTENT translations. A translation is an overlay file next to the guide:
//   content/i18n/he/projects/<same file name>.json
// keyed by the ids already in the guide (steps, materials, pieces, tools…). Anything missing falls back to
// English, so a partial translation is safe. Geometry, formulas and ids are never translated.
// `strings` maps English text that appears inside illustrations (scene labels, template captions) to Hebrew.
import type { Project, SceneEl, Step, Visual } from "./types";

export interface ProjectTranslation {
  /** "draft" = machine/AI draft, not yet reviewed by a person (shown to the reader). */
  status: "draft" | "reviewed";
  title?: string;
  summary?: string;
  description?: string;
  customNote?: string;
  /** Translation of review.note (the "not yet test-sewn" explanation). */
  reviewNote?: string;
  finished?: { label?: string; dims?: string[] };
  params?: Record<string, { label?: string; help?: string }>;
  sizes?: Record<string, string>;
  tools?: Record<string, { name?: string; why?: string; substitutes?: string[] }>;
  materials?: Record<string, { name?: string; why?: string; quantity?: string; weight?: string; recommended?: string[]; alternatives?: string[] }>;
  pieces?: Record<string, { name?: string; notes?: string; markings?: string[] }>;
  steps?: Record<string, { title?: string; text?: string; beginner?: string; expert?: string; tips?: string[]; warnings?: string[]; alt?: string; measurements?: string[] }>;
  gallery?: string[];
  strings?: Record<string, string>;
}

export type Translations = Partial<Record<"he", ProjectTranslation>>;

const pick = <T,>(v: T | undefined, fallback: T): T => (v === undefined || v === "" ? fallback : v);
const pickArr = (v: string[] | undefined, fallback: string[] | undefined) => (v && fallback && v.length === fallback.length ? v : fallback);

function mapScene(els: SceneEl[], s: Record<string, string>): SceneEl[] {
  return els.map((e) => {
    if (e.k === "label") return s[e.text] ? { ...e, text: s[e.text] } : e;
    if ("label" in e && typeof e.label === "string" && s[e.label]) return { ...e, label: s[e.label] } as SceneEl;
    return e;
  });
}

function mapVisual(v: Visual, s: Record<string, string>): Visual {
  if (v.type !== "scene") return v;
  const scene = { els: mapScene(v.scene.els, s) };
  return v.frames ? { type: "scene", scene, frames: v.frames.map((f) => ({ ...f, els: mapScene(f.els, s), caption: s[f.caption] ?? f.caption })) } : { type: "scene", scene };
}

/** Pure: returns the project with the overlay applied (or the same object when there is none). */
export function localizeProject(p: Project, lang: "en" | "he"): Project {
  const tr = lang === "he" ? p.i18n?.he : undefined;
  if (!tr) return p;
  const s = tr.strings ?? {};
  const steps: Step[] = p.steps.map((st) => {
    const o = tr.steps?.[st.id] ?? {};
    return {
      ...st,
      title: pick(o.title, st.title),
      text: pick(o.text, st.text),
      beginner: st.beginner === undefined ? undefined : pick(o.beginner, st.beginner),
      expert: pick(o.expert, st.expert),
      tips: pickArr(o.tips, st.tips),
      warnings: pickArr(o.warnings, st.warnings),
      alt: pick(o.alt, st.alt),
      measurements: st.measurements?.map((m, i) => ({ ...m, label: pick(o.measurements?.[i], m.label) })),
      visual: mapVisual(st.visual, s),
    };
  });
  return {
    ...p,
    title: pick(tr.title, p.title),
    summary: pick(tr.summary, p.summary),
    description: pick(tr.description, p.description),
    customNote: pick(tr.customNote, p.customNote),
    review: { ...p.review, note: p.review.note === undefined ? undefined : pick(tr.reviewNote, p.review.note) },
    finished: {
      label: pick(tr.finished?.label, p.finished.label),
      dims: p.finished.dims.map((d, i) => ({ ...d, label: pick(tr.finished?.dims?.[i], d.label) })),
    },
    params: p.params.map((x) => ({ ...x, label: pick(tr.params?.[x.id]?.label, x.label), help: x.help === undefined ? undefined : pick(tr.params?.[x.id]?.help, x.help) })),
    sizes: p.sizes.map((x) => ({ ...x, label: pick(tr.sizes?.[x.id], x.label) })),
    tools: p.tools.map((x) => {
      const o = tr.tools?.[x.id] ?? {};
      return { ...x, name: pick(o.name, x.name), why: pick(o.why, x.why), substitutes: pickArr(o.substitutes, x.substitutes) };
    }),
    materials: p.materials.map((x) => {
      const o = tr.materials?.[x.id] ?? {};
      return {
        ...x, name: pick(o.name, x.name), why: pick(o.why, x.why),
        quantity: x.quantity === undefined ? undefined : pick(o.quantity, x.quantity),
        weight: x.weight === undefined ? undefined : pick(o.weight, x.weight),
        recommended: pickArr(o.recommended, x.recommended), alternatives: pickArr(o.alternatives, x.alternatives),
      };
    }),
    pieces: p.pieces.map((x) => {
      const o = tr.pieces?.[x.id] ?? {};
      return { ...x, name: pick(o.name, x.name), notes: x.notes === undefined ? undefined : pick(o.notes, x.notes), markings: pickArr(o.markings, x.markings) };
    }),
    steps,
    gallery: p.gallery.map((g, i) => ({ label: pick(tr.gallery?.[i], g.label), scene: { els: mapScene(g.scene.els, s) } })),
  };
}

/** Placeholders like {zip} or {W + 2*sa} that must survive translation unchanged. */
export function placeholders(text: string | undefined): string[] {
  return (text?.match(/\{[^}]+\}/g) ?? []).sort();
}
