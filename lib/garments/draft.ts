// Drafts a FreeSewing design in the browser and lays its pieces out for tiled printing.
// FreeSewing (https://freesewing.eu) is MIT-licensed; see THIRD_PARTY_NOTICES.md.
import type { DesignId } from "./designs";
import { planPrint, type PrintPlan } from "../printLayout";

/* eslint-disable @typescript-eslint/no-explicit-any */
type DesignClass = any;

const loaders: Record<DesignId, () => Promise<any>> = {
  sandy: () => import("@freesewing/sandy"),
  penelope: () => import("@freesewing/penelope"),
  tamiko: () => import("@freesewing/tamiko"),
  aaron: () => import("@freesewing/aaron"),
  teagan: () => import("@freesewing/teagan"),
  hugo: () => import("@freesewing/hugo"),
};

export interface LoadedDesign {
  Design: DesignClass;
  /** English strings for the text FreeSewing writes on the pattern ("teagan:front", "plugin-annotations:cut"…). */
  strings: Record<string, string>;
  theme: unknown;
}

const humanize = (key: string) => {
  const s = key.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/[._-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

function flatten(ns: string, obj: any, out: Record<string, string>) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k === "o") continue; // option descriptions are never printed
    if (typeof v === "string") {
      if (k !== "t" && k !== "d") out[`${ns}:${k.replace(/\.t$/, "")}`] ??= v;
    } else if (v && typeof v === "object") flatten(ns, v, out);
  }
}

export async function loadDesign(id: DesignId): Promise<LoadedDesign> {
  const [mod, theme, annotations] = await Promise.all([
    loaders[id](),
    import("@freesewing/plugin-theme"),
    import("@freesewing/plugin-annotations"),
  ]);
  const Design = Object.values(mod).find((x: any) => typeof x === "function" && x.patternConfig);
  const strings: Record<string, string> = {};
  const annoEn = (annotations as any).i18n?.en ?? {};
  for (const [k, v] of Object.entries(annoEn)) if (typeof v === "string") strings[k] = v;
  flatten(id, mod.i18n?.en, strings);
  return { Design, strings, theme: (theme as any).themePlugin };
}

export interface Piece {
  /** Stack name, e.g. "teagan.front". */
  id: string;
  name: string;
  w: number; // mm
  h: number;
  tlx: number;
  tly: number;
}

export interface Drafted {
  pieces: Piece[];
  errors: string[];
}

function settingsFor(measurements: Record<string, number>, units: "metric" | "imperial", extra: object = {}) {
  return { measurements, units, sa: 10, complete: true, expand: true, locale: "en", ...extra };
}

function textPlugin(strings: Record<string, string>) {
  const tr = (s: string) => strings[s] ?? (/^[\w-]+:\w/.test(s) ? humanize(s.split(":").pop() ?? s) : s);
  return {
    name: "sewcraft-text",
    version: "1",
    hooks: { insertText: (_locale: string, text: string | string[]) => (Array.isArray(text) ? text.map(tr).join(" ") : tr(text)) },
  };
}

/** First pass: draft once to learn each piece's size. */
export function measurePieces(d: LoadedDesign, measurements: Record<string, number>, units: "metric" | "imperial"): Drafted {
  const p = new d.Design(settingsFor(measurements, units));
  const errors: string[] = [];
  try {
    p.draft();
  } catch (e) {
    return { pieces: [], errors: [String(e)] };
  }
  for (const e of p.store?.logs?.error ?? []) errors.push(String(e));
  const rp = p.getRenderProps();
  const pieces = Object.entries(rp.stacks as Record<string, any>).map(([id, s]) => ({
    id,
    name: (d.strings[`${id.split(".")[0]}:${id.split(".")[1]}`] ?? humanize(id.split(".").pop() ?? id)),
    w: s.bottomRight.x - s.topLeft.x,
    h: s.bottomRight.y - s.topLeft.y,
    tlx: s.topLeft.x,
    tly: s.topLeft.y,
  }));
  return { pieces, errors };
}

/** Second pass: draft again with the pieces moved to where the print plan put them, and return SVG markup. */
export function renderPlanned(d: LoadedDesign, measurements: Record<string, number>, units: "metric" | "imperial", pieces: Piece[], plan: PrintPlan): string {
  const placed = new Map(plan.placements.map((pl) => [pl.id, pl]));
  const stacks: Record<string, { move: { x: number; y: number } }> = {};
  for (const pc of pieces) {
    const pl = placed.get(pc.id);
    // Pieces left out of the print are parked far outside every page.
    stacks[pc.id] = { move: pl ? { x: pl.x - pc.tlx, y: pl.y - pc.tly } : { x: -1e6, y: -1e6 } };
  }
  const W = plan.cols * plan.tileW, H = plan.rows * plan.tileH;
  const p = new d.Design(settingsFor(measurements, units, { layout: { stacks, width: W, height: H } }));
  p.use(d.theme).use(textPlugin(d.strings));
  p.draft();
  const svg: string = p.render();
  // Keep the inner markup (style, defs, stacks); the caller supplies the outer <svg> with its own viewBox.
  const start = svg.indexOf(">", svg.indexOf("<svg")) + 1;
  return svg.slice(start, svg.lastIndexOf("</svg>"));
}

export { planPrint };

/** Size presets from FreeSewing's measurement sets (EU sizes), in mm / degrees. */
export async function loadPresets(): Promise<{ id: string; group: "f" | "m"; size: string; values: Record<string, number> }[]> {
  const m: any = await import("@freesewing/models");
  const out: { id: string; group: "f" | "m"; size: string; values: Record<string, number> }[] = [];
  for (const [size, values] of Object.entries(m.cisFemaleAdult ?? {})) out.push({ id: `f${size}`, group: "f", size, values: values as Record<string, number> });
  for (const [size, values] of Object.entries(m.cisMaleAdult ?? {})) out.push({ id: `m${size}`, group: "m", size, values: values as Record<string, number> });
  return out;
}
