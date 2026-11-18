// Content schema for SewCraft projects. Project definitions live in /content as JSON
// and are validated at load time (lib/validate.ts). User state lives separately (lib/store.ts).

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Stage = "prep" | "cut" | "sew" | "assemble" | "finish";
export type Units = "metric" | "imperial";
export type Level = "beginner" | "standard" | "expert";

/** A number, or a formula string evaluated against project params/constants (see lib/formula.ts). */
export type Expr = number | string;

export interface Param {
  id: string;
  label: string;
  default: number; // cm
  min: number;
  max: number;
  step: number;
  help?: string;
}

export interface SizePreset {
  id: string;
  label: string;
  values: Record<string, number>;
}

export interface Tool {
  id: string;
  name: string;
  required: boolean;
  why: string;
  substitutes?: string[];
}

export interface FabricLayoutSpec {
  mode: "folded" | "single";
  defaultWidth: number; // cm
  widths: number[]; // common bolt widths to offer, cm
}

export interface Material {
  id: string;
  name: string;
  kind: "fabric" | "interfacing" | "notion" | "thread";
  required: boolean;
  /** For notions: human quantity, may contain {expr} placeholders resolved in cm, e.g. "Zipper {zip} long". */
  quantity?: string;
  recommended?: string[];
  minWidthCm?: number;
  weight?: string;
  alternatives?: string[];
  why: string;
  swatch: string; // hex used in diagrams
  layout?: FabricLayoutSpec; // fabrics/interfacing only — quantity is derived from the cutting layout
}

export interface PatternPiece {
  id: string;
  name: string;
  materialId: string;
  quantity: number;
  /** Cut dimensions INCLUDING seam allowance, in cm. Width = across the grain, height = along the grain. */
  width: Expr;
  height: Expr;
  seamAllowance: Expr;
  grain: "lengthwise" | "any";
  /** If true, the left edge of the piece sits on the fabric fold; width is the full opened width. */
  onFold?: boolean;
  markings?: string[];
  notes?: string;
  color: string;
  /**
   * Curved / shaped pieces: an SVG path (absolute M L C Q A Z commands) in cm inside the cut-size box,
   * with {formula} placeholders. Variables: project params & constants plus w, h (cut size) and hw (w/2).
   * For onFold pieces the outline describes the HALF piece, with the fold at x = 0.
   * The outline includes seam allowance; the layout packs the bounding box.
   */
  outline?: string;
}

export type Pt = [number, number];

/** Instruction scene primitives, drawn on a 400×300 canvas by components/scene/SceneView. */
export type SceneEl =
  | { k: "panel"; x: number; y: number; w: number; h: number; tone: string; side?: "right" | "wrong"; label?: string; notch?: number; rx?: number; dim?: boolean }
  | { k: "poly"; pts: Pt[]; tone: string; side?: "right" | "wrong"; label?: string }
  | { k: "stitch"; pts: Pt[]; closed?: boolean; color?: string }
  | { k: "arrow"; from: Pt; to: Pt; bend?: number; label?: string; color?: string }
  | { k: "fold"; from: Pt; to: Pt; label?: string }
  | { k: "dim"; from: Pt; to: Pt; value: Expr; offset?: number; unit?: "len" | "mm" }
  | { k: "label"; x: number; y: number; text: string; size?: number; anchor?: "start" | "middle" | "end"; bold?: boolean }
  | { k: "pin"; x: number; y: number; angle?: number }
  | { k: "clip"; x: number; y: number }
  | { k: "gap"; from: Pt; to: Pt; label?: string }
  | { k: "focus"; x: number; y: number; r: number }
  | { k: "iron"; x: number; y: number }
  | { k: "foot"; x: number; y: number }
  | { k: "scissors"; x: number; y: number; angle?: number }
  | { k: "zip"; x: number; y: number; w: number; open?: boolean }
  | { k: "cord"; pts: Pt[]; color?: string }
  | { k: "elastic"; x: number; y: number; w: number }
  | { k: "cutout"; x: number; y: number; s: number }
  | { k: "path"; d: string; tone: string; side?: "right" | "wrong"; label?: string; lx?: number; ly?: number };

export interface Scene {
  els: SceneEl[];
}

/** One beat of an animated demonstration: a full scene plus a short caption (drawn on the same 400×300 canvas). */
export interface Frame {
  els: SceneEl[];
  caption: string;
  /** How long this frame stays up when playing, ms (default 1600). */
  ms?: number;
}

export type Visual =
  | { type: "scene"; scene: Scene; frames?: Frame[] }
  | { type: "layout"; materialId: string }
  | { type: "template"; name: string; args?: Record<string, unknown> }
  | { type: "gallery"; index?: number; label?: string }
  | { type: "photo"; src: string }
  | { type: "missing" };

export interface Measurement {
  label: string;
  value: Expr;
  unit: "len" | "mm" | "min" | "deg";
}

export interface Step {
  id: string;
  stage: Stage;
  title: string;
  /** Standard instructions. */
  text: string;
  /** Extra explanation shown in Beginner mode (in addition to text). */
  beginner?: string;
  /** Concise instruction shown in Expert mode. */
  expert: string;
  measurements?: Measurement[];
  pieces?: string[];
  techniques?: string[];
  tips?: string[];
  warnings?: string[];
  timerMin?: number;
  visual: Visual;
  /** Optional real demonstration video: an .mp4/.webm URL or a YouTube link. Shown next to the illustration. */
  video?: { src: string; title?: string };
  alt: string;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: Difficulty;
  minutes: [number, number];
  costUSD: [number, number];
  machineRequired: boolean;
  techniques: string[];
  finished: { label: string; dims: { label: string; value: Expr }[] };
  constants: Record<string, number>;
  params: Param[];
  sizes: SizePreset[];
  customizable: boolean;
  customNote: string;
  tools: Tool[];
  materials: Material[];
  pieces: PatternPiece[];
  steps: Step[];
  gallery: { label: string; scene: Scene }[];
  related: string[];
  popularity: number;
  /** editorial = written & reviewed by SewCraft; community = shared by a maker, not editorially reviewed. */
  source: "editorial" | "community";
  author?: string;
  /** Maker's cover photo (community guides). Illustrations remain the reference for dimensions. */
  cover?: string;
  /** Guide created in this browser with the guide builder (not in the content folder). */
  local?: boolean;
  featured?: boolean;
  /** Content translations (overlay files in content/i18n/<lang>/), attached by the loader. */
  i18n?: import("./localize").Translations;
  review: {
    status: "draft" | "review" | "published";
    technicallyValidated: boolean;
    reviewer?: string;
    updated: string;
    note?: string;
  };
}

export interface Technique {
  id: string;
  name: string;
  summary: string;
  explanation: string;
  steps: string[];
  tools: string[];
  mistakes: string[];
  scene: Scene;
  alt: string;
}

export interface GlossaryTerm {
  term: string;
  aliases?: string[];
  definition: string;
  technique?: string;
}

export interface Category {
  id: string;
  name: string;
  blurb: string;
  tone: string;
}
