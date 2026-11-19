// Animated demonstrations for the fiddly steps (turning, folding, binding, boxing corners…).
// An animation is a short storyboard of full scenes on the same 400×300 canvas as the template it
// belongs to, built from the SAME template args, so tones, captions and dimensions stay in sync with the
// static illustration. The last frame should match the static template. Keep 3–5 frames, ≤ 45 chars per caption.
import type { Expr, Frame, Pt, SceneEl } from "./types";

type Args = Record<string, unknown>;
const s = (a: Args, k: string, d: string) => (typeof a[k] === "string" && a[k] ? (a[k] as string) : d);
const n = (a: Args, k: string, d: number) => (typeof a[k] === "number" ? (a[k] as number) : d);
const e = (a: Args, k: string, d?: Expr): Expr | undefined => (typeof a[k] === "number" || (typeof a[k] === "string" && a[k] !== "") ? (a[k] as Expr) : d);
const b = (a: Args, k: string, d: boolean) => (typeof a[k] === "boolean" ? (a[k] as boolean) : d);

/** template name → storyboard builder. Templates without an entry stay static. */
export const ANIMATIONS: Record<string, (a: Args) => Frame[]> = {
  turn: (a) => {
    const t = s(a, "tone", "main");
    const lab = (text: string): SceneEl => ({ k: "label", x: 200, y: 26, text, anchor: "middle", bold: true });
    const seam: SceneEl = { k: "stitch", pts: [[90, 50], [90, 230], [165, 230]] };
    const seamR: SceneEl = { k: "stitch", pts: [[235, 230], [310, 230], [310, 50], [90, 50], [90, 230]] };
    return [
      { caption: "Sewn piece, wrong side out", els: [
        { k: "panel", x: 80, y: 40, w: 240, h: 200, tone: t, side: "wrong" }, seamR,
        { k: "gap", from: [165, 240], to: [235, 240], label: "" }, { k: "focus", x: 200, y: 240, r: 44 }, lab("wrong side out"),
      ] },
      { caption: "Reach in through the gap and pull", els: [
        { k: "panel", x: 80, y: 40, w: 240, h: 200, tone: t, side: "wrong" }, seam,
        { k: "panel", x: 165, y: 232, w: 70, h: 40, tone: t, rx: 18 },
        { k: "arrow", from: [200, 120], to: [200, 190], bend: 0 }, { k: "arrow", from: [200, 285], to: [200, 262] }, lab("pull the fabric through"),
      ] },
      { caption: "Keep pulling, it flips over", els: [
        { k: "panel", x: 80, y: 40, w: 240, h: 120, tone: t, side: "wrong" },
        { k: "panel", x: 80, y: 160, w: 240, h: 110, tone: t }, { k: "fold", from: [80, 160], to: [320, 160], label: "" },
        { k: "arrow", from: [345, 80], to: [345, 190], bend: -30 }, lab("right side comes out"),
      ] },
      { caption: "Push the corners out and press", els: [
        { k: "panel", x: 80, y: 40, w: 240, h: 200, tone: t }, { k: "stitch", pts: [[165, 232], [90, 232], [90, 50], [310, 50], [310, 232], [235, 232]] },
        { k: "gap", from: [165, 240], to: [235, 240], label: "" }, { k: "focus", x: 90, y: 50, r: 22 }, { k: "focus", x: 310, y: 50, r: 22 },
        lab(s(a, "label", "turn right side out")),
      ] },
    ];
  },

  fold: (a) => {
    const t = s(a, "tone", "main");
    const dim: SceneEl[] = e(a, "dim") !== undefined ? [{ k: "dim", from: [40, 150], to: [40, 240], value: e(a, "dim")! }] : [];
    const lab: SceneEl = { k: "label", x: 200, y: 280, text: s(a, "label", "fold"), anchor: "middle", bold: true };
    return [
      { caption: "Lay the fabric flat, wrong side up", els: [
        { k: "panel", x: 60, y: 60, w: 280, h: 180, tone: t, side: "wrong" }, { k: "fold", from: [60, 150], to: [340, 150] }, lab,
      ] },
      { caption: "Lift the top edge and start folding", els: [
        { k: "panel", x: 60, y: 150, w: 280, h: 90, tone: t, side: "wrong" },
        { k: "poly", pts: [[60, 150], [340, 150], [330, 100], [70, 100]], tone: t }, { k: "fold", from: [60, 150], to: [340, 150] },
        { k: "arrow", from: [360, 80], to: [360, 130], bend: -25 }, lab,
      ] },
      { caption: "Bring the edge down to the bottom", els: [
        { k: "panel", x: 60, y: 150, w: 280, h: 90, tone: t, side: "wrong" },
        { k: "poly", pts: [[60, 150], [340, 150], [340, 205], [60, 205]], tone: t }, { k: "fold", from: [60, 150], to: [340, 150] },
        { k: "arrow", from: [360, 100], to: [360, 190], bend: -30 }, lab,
      ] },
      { caption: "Press along the fold", els: [
        { k: "panel", x: 60, y: 60, w: 280, h: 90, tone: t, side: "wrong" }, { k: "panel", x: 60, y: 150, w: 280, h: 90, tone: t },
        { k: "fold", from: [60, 150], to: [340, 150] }, { k: "arrow", from: [360, 220], to: [360, 90], bend: -30 }, lab, ...dim,
      ] },
    ];
  },

  tube: (a) => {
    const t = s(a, "tone", "main");
    const lab: SceneEl = { k: "label", x: 200, y: 275, text: s(a, "label", ""), anchor: "middle" };
    return [
      { caption: "Fold the strip in half, right sides in", els: [
        { k: "panel", x: 20, y: 60, w: 360, h: 120, tone: t, side: "wrong" }, { k: "fold", from: [20, 120], to: [380, 120], label: "fold" },
        { k: "arrow", from: [200, 70], to: [200, 118], bend: 20 }, lab,
      ] },
      { caption: "Sew along the long edge", els: [
        { k: "panel", x: 20, y: 90, w: 360, h: 60, tone: t, side: "wrong" }, { k: "fold", from: [20, 90], to: [380, 90], label: "fold" },
        { k: "stitch", pts: [[20, 140], [260, 140]] }, { k: "foot", x: 272, y: 140 }, lab,
      ] },
      { caption: "Turn it right side out", els: [
        { k: "panel", x: 20, y: 90, w: 360, h: 60, tone: t, side: "wrong" }, { k: "stitch", pts: [[20, 140], [380, 140]] },
        { k: "panel", x: 20, y: 200, w: 200, h: 34, tone: t, rx: 16 }, { k: "panel", x: 220, y: 200, w: 160, h: 34, tone: t, side: "wrong", rx: 16 },
        { k: "arrow", from: [330, 170], to: [250, 195], bend: 20 }, lab,
      ] },
      { caption: "A neat tube with the seam inside", els: [
        { k: "panel", x: 20, y: 90, w: 360, h: 60, tone: t, side: "wrong" }, { k: "stitch", pts: [[20, 140], [380, 140]] },
        { k: "fold", from: [20, 90], to: [380, 90], label: "fold" },
        { k: "panel", x: 20, y: 200, w: 360, h: 34, tone: t, rx: 16 }, { k: "arrow", from: [200, 160], to: [200, 194] }, lab,
      ] },
    ];
  },

  hem: (a) => {
    const t = s(a, "tone", "main");
    const stitched = b(a, "stitched", true);
    const f2 = e(a, "f2", 2)!;
    const lab = (text: string): SceneEl => ({ k: "label", x: 200, y: 285, text, anchor: "middle" });
    const base: SceneEl = { k: "panel", x: 60, y: 50, w: 280, h: 190, tone: t, side: "wrong" };
    return [
      { caption: "Start with the raw edge, wrong side up", els: [base, { k: "stitch", pts: [[60, 240], [340, 240]], color: "#b9ab98" }, lab("raw edge"), { k: "focus", x: 200, y: 240, r: 30 }] },
      { caption: "Fold the raw edge up and press", els: [
        { ...base, h: 160 }, { k: "panel", x: 60, y: 210, w: 280, h: 30, tone: t }, // folded onto the wrong side → its right side shows
        { k: "fold", from: [60, 210], to: [340, 210] }, { k: "iron", x: 200, y: 160 }, lab("first fold"),
      ] },
      { caption: "Fold up again to hide the raw edge", els: [
        { ...base, h: 140 }, { k: "panel", x: 60, y: 190, w: 280, h: 50, tone: t, side: "wrong" }, // folded again → wrong side shows
        { k: "fold", from: [60, 190], to: [340, 190] }, { k: "arrow", from: [370, 240], to: [370, 195], bend: -20 },
        { k: "dim", from: [354, 190], to: [354, 240], value: f2 }, lab("second fold"),
      ] },
      { caption: stitched ? "Stitch close to the inner fold" : "Press the hem flat", els: [
        { ...base }, { k: "panel", x: 60, y: 190, w: 280, h: 50, tone: t }, { k: "fold", from: [60, 240], to: [340, 240], label: "" },
        { k: "dim", from: [354, 190], to: [354, 240], value: f2 }, lab("fold once, then again"),
        ...(stitched ? [{ k: "stitch", pts: [[60, 194], [340, 194]] } as SceneEl, { k: "foot", x: 260, y: 194 } as SceneEl] : [{ k: "iron", x: 200, y: 110 } as SceneEl]),
      ] },
    ];
  },

  binding: (a) => {
    const t = s(a, "tone", "main"), bd = s(a, "bind", "lining");
    const w = e(a, "width");
    const lab = (text: string): SceneEl => ({ k: "label", x: 200, y: 290, text, anchor: "middle" });
    const dim: SceneEl[] = w !== undefined ? [{ k: "dim", from: [352, 48], to: [352, 70], value: w }] : [];
    return [
      { caption: "Lay the open binding on the edge", els: [
        { k: "panel", x: 60, y: 70, w: 280, h: 180, tone: t }, { k: "panel", x: 60, y: 40, w: 280, h: 30, tone: bd, side: "wrong" },
        { k: "fold", from: [60, 55], to: [340, 55] }, { k: "pin", x: 100, y: 62 }, { k: "pin", x: 300, y: 62 }, lab("binding right side down on the front"),
      ] },
      { caption: "Sew the binding to the front", els: [
        { k: "panel", x: 60, y: 60, w: 280, h: 190, tone: t }, { k: "panel", x: 60, y: 36, w: 280, h: 30, tone: bd, side: "wrong" },
        { k: "stitch", pts: [[60, 62], [260, 62]] }, { k: "foot", x: 272, y: 62 }, lab("sew along the first crease"),
      ] },
      { caption: "Wrap it over the edge to the back", els: [
        { k: "panel", x: 60, y: 60, w: 280, h: 190, tone: t },
        { k: "panel", x: 60, y: 40, w: 280, h: 22, tone: bd }, { k: "arrow", from: [200, 30], to: [200, 100], bend: 40 },
        { k: "panel", x: 60, y: 70, w: 280, h: 18, tone: bd, dim: true }, lab("fold to the back, cover the stitching"),
      ] },
      { caption: "Stitch in the ditch from the front", els: [
        { k: "panel", x: 60, y: 60, w: 280, h: 190, tone: t }, { k: "panel", x: 60, y: 48, w: 280, h: 22, tone: bd },
        { k: "stitch", pts: [[60, 66], [340, 66]] }, { k: "foot", x: 250, y: 66 }, lab("sew to front, wrap to back, stitch"), ...dim,
      ] },
    ];
  },

  box: (a) => {
    const t = s(a, "tone", "main");
    const depth = e(a, "depth", 8)!;
    return [
      { caption: "Start with the flat bottom corner", els: [
        { k: "panel", x: 100, y: 40, w: 200, h: 200, tone: t, side: "wrong" }, { k: "fold", from: [300, 40], to: [300, 240], label: "side seam" },
        { k: "stitch", pts: [[100, 228], [300, 228]] }, { k: "label", x: 200, y: 270, text: "bottom seam", anchor: "middle" }, { k: "focus", x: 300, y: 235, r: 30 },
      ] },
      { caption: "Pull the corner open into a point", els: [
        { k: "poly", pts: [[200, 40], [300, 240], [100, 240]], tone: t, side: "wrong" }, { k: "arrow", from: [240, 80], to: [300, 140], bend: 0 },
        { k: "arrow", from: [160, 80], to: [100, 140], bend: 0 }, { k: "label", x: 200, y: 275, text: "open the corner", anchor: "middle" },
      ] },
      { caption: "Match the seams, flatten to a triangle", els: [
        { k: "poly", pts: [[200, 30], [330, 230], [70, 230]], tone: t, side: "wrong" },
        { k: "fold", from: [200, 30], to: [200, 230], label: "seams matched" }, { k: "pin", x: 200, y: 120 },
      ] },
      { caption: "Sew straight across at the width", els: [
        { k: "poly", pts: [[200, 30], [330, 230], [70, 230]], tone: t, side: "wrong" },
        { k: "fold", from: [200, 30], to: [200, 230], label: "seams matched" }, { k: "stitch", pts: [[85, 214], [250, 214]] }, { k: "foot", x: 262, y: 214 },
        { k: "dim", from: [85, 262], to: [315, 262], value: depth },
      ] },
      { caption: "Trim off the point", els: [
        { k: "poly", pts: [[200, 30], [330, 230], [70, 230]], tone: t, side: "wrong", }, { k: "scissors", x: 330, y: 120, angle: 150 },
        { k: "fold", from: [200, 30], to: [200, 230], label: "seams matched" }, { k: "stitch", pts: [[85, 214], [315, 214]] },
        { k: "dim", from: [85, 262], to: [315, 262], value: depth },
      ] },
    ];
  },

  miter: (a) => {
    const t = s(a, "tone", "main");
    const lab = (text: string): SceneEl => ({ k: "label", x: 160, y: 285, text, anchor: "middle" });
    const base: SceneEl = { k: "panel", x: 60, y: 40, w: 260, h: 220, tone: t, side: "wrong" };
    return [
      { caption: "Fold both hem edges and press", els: [
        base, { k: "panel", x: 60, y: 40, w: 260, h: 60, tone: t }, { k: "panel", x: 260, y: 40, w: 60, h: 220, tone: t },
        { k: "fold", from: [60, 100], to: [320, 100] }, { k: "fold", from: [260, 40], to: [260, 260] }, lab("press both folds"),
      ] },
      { caption: "Open out and fold the corner in", els: [
        base, { k: "poly", pts: [[260, 100], [320, 100], [320, 160], [260, 160]], tone: t, side: "wrong" }, { k: "poly", pts: [[260, 100], [320, 40], [320, 100]], tone: t },
        { k: "fold", from: [260, 100], to: [320, 40] }, { k: "arrow", from: [330, 40], to: [285, 90], bend: 20 }, lab("fold the corner point in"),
      ] },
      { caption: "Fold the edges in to meet diagonally", els: [
        base, { k: "poly", pts: [[260, 40], [320, 40], [320, 100], [260, 100]], tone: t },
        { k: "fold", from: [260, 40], to: [320, 100] }, { k: "arrow", from: [160, 70], to: [240, 70], bend: 15 }, lab("edges meet in a diagonal line"),
      ] },
      { caption: "Stitch the hem around the corner", els: [
        base, { k: "poly", pts: [[260, 40], [320, 40], [320, 100], [260, 100]], tone: t },
        { k: "fold", from: [260, 40], to: [320, 100], label: "" }, { k: "stitch", pts: [[60, 104], [256, 104], [256, 260]] },
        { k: "focus", x: 290, y: 70, r: 40 }, lab("fold corner diagonally, then hem"),
      ] },
    ];
  },

  zip: (a) => {
    const t = s(a, "tone", "main"), l = s(a, "lining", "lining");
    const lab = (text: string): SceneEl => ({ k: "label", x: 200, y: 290, text, anchor: "middle" });
    return [
      { caption: "Outer fabric right side up", els: [{ k: "panel", x: 60, y: 120, w: 280, h: 140, tone: t }, lab("outer fabric, right side up")] },
      { caption: "Lay the zipper face down on the edge", els: [
        { k: "panel", x: 60, y: 120, w: 280, h: 140, tone: t }, { k: "zip", x: 60, y: 112, w: 280 }, { k: "arrow", from: [200, 40], to: [200, 100] }, lab("zipper face down on top"),
      ] },
      { caption: "Add the lining face down on top", els: [
        { k: "panel", x: 60, y: 120, w: 280, h: 140, tone: t }, { k: "zip", x: 60, y: 112, w: 280 },
        { k: "panel", x: 60, y: 60, w: 280, h: 44, tone: l, side: "wrong", dim: true }, { k: "arrow", from: [200, 40], to: [200, 100], bend: 0 }, lab("lining face down"),
      ] },
      { caption: "Stitch along the zipper tape", els: [
        { k: "panel", x: 60, y: 120, w: 280, h: 140, tone: t }, { k: "zip", x: 60, y: 112, w: 280 },
        { k: "panel", x: 60, y: 104, w: 280, h: 44, tone: l, side: "wrong", dim: true, label: "lining face down" },
        { k: "stitch", pts: [[60, 126], [220, 126]] }, { k: "foot", x: 232, y: 126 }, lab("outer up · zipper face down · lining face down"),
      ] },
    ];
  },

  casing: (a) => {
    const t = s(a, "tone", "main"), ins = s(a, "insert", "elastic"), gap = b(a, "gap", true);
    const depth = e(a, "depth", 3)!;
    const base: SceneEl = { k: "panel", x: 60, y: 70, w: 280, h: 180, tone: t, side: "wrong" };
    return [
      { caption: "Mark the casing depth on the top edge", els: [
        { k: "panel", x: 60, y: 40, w: 280, h: 210, tone: t, side: "wrong" }, { k: "fold", from: [60, 70], to: [340, 70] }, { k: "dim", from: [354, 40], to: [354, 70], value: depth },
      ] },
      { caption: "Fold the top edge down and press", els: [
        { ...base }, { k: "poly", pts: [[60, 70], [340, 70], [340, 40], [60, 40]], tone: t }, { k: "arrow", from: [370, 40], to: [370, 90], bend: -20 }, { k: "dim", from: [354, 70], to: [354, 116], value: depth },
      ] },
      { caption: "Stitch the channel, leave an opening", els: [
        base, { k: "panel", x: 60, y: 70, w: 280, h: 46, tone: t }, { k: "stitch", pts: [[60, 112], [gap ? 270 : 340, 112]] }, { k: "foot", x: 150, y: 112 },
        ...(gap ? [{ k: "gap", from: [270, 130], to: [340, 130], label: "opening" } as SceneEl] : []),
      ] },
      { caption: ins === "none" ? "The channel is ready" : `Thread the ${ins} through`, els: [
        base, { k: "panel", x: 60, y: 70, w: 280, h: 46, tone: t }, { k: "stitch", pts: [[60, 112], [gap ? 270 : 340, 112]] },
        { k: "dim", from: [354, 70], to: [354, 116], value: depth },
        ...(gap ? [{ k: "gap", from: [270, 130], to: [340, 130], label: "opening" } as SceneEl] : []),
        ...(ins === "elastic" ? [{ k: "elastic", x: 70, y: 84, w: 190 } as SceneEl] : []),
        ...(ins === "cord" ? [{ k: "cord", pts: [[30, 92], [60, 92], [340, 92], [370, 92]], color: "#E8E0D2" } as SceneEl] : []),
      ] },
    ];
  },

  close: (a) => {
    const t = s(a, "tone", "main"), hand = s(a, "method", "machine") === "hand";
    const lab = (text: string): SceneEl => ({ k: "label", x: 200, y: 240, text, anchor: "middle" });
    const ladder: Pt[] = [[120, 150], [120, 152], [140, 152], [140, 150], [160, 150], [160, 152], [180, 152], [180, 150], [200, 150], [200, 152], [220, 152], [220, 150], [240, 150], [240, 152], [260, 152]];
    return [
      { caption: "Open gap with raw edges showing", els: [
        { k: "panel", x: 40, y: 100, w: 320, h: 40, tone: t }, { k: "panel", x: 40, y: 164, w: 320, h: 40, tone: t }, { k: "gap", from: [100, 152], to: [300, 152], label: "gap" }, lab("the opening in the seam"),
      ] },
      { caption: "Tuck the raw edges inside and pin", els: [
        { k: "panel", x: 40, y: 110, w: 320, h: 40, tone: t }, { k: "panel", x: 40, y: 152, w: 320, h: 40, tone: t },
        { k: "arrow", from: [330, 90], to: [270, 128], bend: 15 }, { k: "arrow", from: [330, 214], to: [270, 176], bend: -15 },
        { k: "pin", x: 130, y: 150, angle: 90 }, { k: "pin", x: 270, y: 150, angle: 90 }, lab("fold both edges in, pin together"),
      ] },
      { caption: hand ? "Sew small stitches along the fold" : "Stitch close to the folded edge", els: [
        { k: "panel", x: 40, y: 110, w: 320, h: 40, tone: t }, { k: "panel", x: 40, y: 152, w: 320, h: 40, tone: t },
        ...(hand ? [{ k: "stitch", pts: ladder.slice(0, 9) } as SceneEl] : [{ k: "stitch", pts: [[130, 148], [220, 148]] } as SceneEl, { k: "foot", x: 232, y: 148 } as SceneEl]), lab(hand ? "work along the gap" : "edgestitch along the gap"),
      ] },
      { caption: "Closed, with no gap left", els: [
        { k: "panel", x: 40, y: 110, w: 320, h: 40, tone: t }, { k: "panel", x: 40, y: 152, w: 320, h: 40, tone: t },
        ...(hand ? [{ k: "stitch", pts: ladder } as SceneEl, { k: "label", x: 200, y: 240, text: "ladder stitch: cross straight over", anchor: "middle" } as SceneEl]
          : [{ k: "stitch", pts: [[130, 148], [270, 148]] } as SceneEl, { k: "foot", x: 280, y: 148 } as SceneEl, { k: "label", x: 200, y: 240, text: "tuck edges in, edgestitch closed", anchor: "middle" } as SceneEl]),
      ] },
    ];
  },
};

void n;

export function animationFor(name: string, args: Args | undefined): Frame[] | undefined {
  const f = ANIMATIONS[name];
  return f ? f(args ?? {}) : undefined;
}
