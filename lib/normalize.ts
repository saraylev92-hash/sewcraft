// Turns compact authored content (editorial JSON or a community guide from the builder) into a full
// Project: resolves catalog tools ("iron", "seam-ripper?"), the "thread" material shorthand, defaults,
// and expands illustration templates into scenes. Client-safe — used by the server loader and the builder.
import { expandTemplate, templateAlt } from "./templates";
import { animationFor } from "./animations";
import type { Material, Project, Step, Tool, Visual } from "./types";

export type ToolCatalog = Record<string, { name: string; why: string; substitutes?: string[] }>;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeProject(raw: any, catalog: ToolCatalog): { project: Project; issues: string[] } {
  const issues: string[] = [];

  const tools: Tool[] = (raw.tools ?? []).map((t: any) => {
    if (typeof t !== "string") return t as Tool;
    const optional = t.endsWith("?");
    const id = optional ? t.slice(0, -1) : t;
    const c = catalog[id];
    if (!c) { issues.push(`Unknown catalog tool "${id}"`); return { id, name: id, required: !optional, why: "" }; }
    return { id, name: c.name, why: c.why, substitutes: c.substitutes, required: !optional };
  });

  const materials: Material[] = (raw.materials ?? []).map((m: any) =>
    m === "thread"
      ? { id: "thread", name: "All-purpose thread", kind: "thread", required: true, quantity: "1 spool", why: "Construction — polyester is strongest.", swatch: "#3A3530" }
      : m,
  );

  const gallery = raw.gallery ?? [];
  const steps: Step[] = (raw.steps ?? []).map((st: any, i: number) => {
    let visual: Visual = st.visual ?? { type: "missing" };
    let alt: string = st.alt ?? "";
    if (visual.type === "template") {
      try {
        const els = expandTemplate(visual.name, visual.args);
        alt ||= templateAlt(visual.name, visual.args);
        const frames = animationFor(visual.name, visual.args);
        visual = frames ? { type: "scene", scene: { els }, frames } : { type: "scene", scene: { els } };
      } catch (e) {
        issues.push(`Step ${i + 1}: ${(e as Error).message}`);
        visual = { type: "missing" };
      }
    } else if (visual.type === "gallery") {
      const g = gallery[visual.index ?? 0];
      alt ||= `The finished ${raw.title ?? "project"}.`;
      visual = g ? { type: "scene", scene: { els: [...g.scene.els, ...(visual.label ? [{ k: "label", x: 200, y: 292, text: visual.label, anchor: "middle", bold: true }] : [])] } } as Visual : { type: "missing" };
    } else if (visual.type === "layout") {
      alt ||= `Cutting layout for ${materials.find((m) => m.id === (visual as { materialId: string }).materialId)?.name ?? "the fabric"}.`;
    } else if (visual.type === "photo" && !visual.src) {
      visual = { type: "missing" };
    } else if (visual.type === "photo") {
      alt ||= "Maker's photo of this step.";
    }
    const firstSentence = String(st.text ?? "").split(/(?<=[.!?])\s/)[0];
    return { ...st, id: st.id ?? `s${i + 1}`, expert: st.expert ?? firstSentence, visual, alt };
  });

  const techniques: string[] = raw.techniques ?? [...new Set(steps.flatMap((s) => s.techniques ?? []))];

  const project: Project = {
    constants: {},
    params: [],
    sizes: [],
    customNote: raw.params?.length ? "" : "This pattern is a single fixed size.",
    related: [],
    popularity: 50,
    costUSD: [5, 20],
    tags: [],
    finished: { label: "Finished size", dims: [] },
    source: "editorial",
    ...raw,
    customizable: raw.customizable ?? Boolean(raw.params?.length),
    techniques,
    tools,
    materials,
    steps,
    gallery,
    review: { status: "draft", technicallyValidated: false, updated: "", ...(raw.review ?? {}) },
  };
  return { project, issues };
}
