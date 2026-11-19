// Content validation rules (spec §17). Run at load time, in `npm run validate`, and shown in Studio → Content.
import { evaluate } from "./formula";
import { packLayout } from "./layout";
import { resolveOutline, resolvePieces } from "./resolve";
import type { Project, Technique } from "./types";

export interface Issue {
  level: "error" | "warning";
  rule: string;
  message: string;
}

const STAGE_ORDER: Record<string, number> = { prep: 0, cut: 1, sew: 2, assemble: 2, finish: 3 };
const SCENE_KINDS = new Set(["panel", "poly", "stitch", "arrow", "fold", "dim", "label", "pin", "clip", "gap", "focus", "iron", "foot", "scissors", "zip", "cord", "elastic", "cutout", "path"]);

export function validateProject(p: Project, techniques: Technique[]): Issue[] {
  const issues: Issue[] = [];
  const err = (rule: string, message: string) => issues.push({ level: "error", rule, message });
  const warn = (rule: string, message: string) => issues.push({ level: "warning", rule, message });
  const vars = { ...p.constants, ...Object.fromEntries(p.params.map((x) => [x.id, x.default])) };

  // 1. tools & materials
  if (!p.tools.length) err("1 tools", "No tools defined.");
  if (!p.materials.length) err("1 materials", "No materials defined.");

  // 2/3/7. piece geometry valid at defaults and at every param extreme; seam allowance explicit
  const combos: Record<string, number>[] = [Object.fromEntries(p.params.map((x) => [x.id, x.default]))];
  for (const prm of p.params) {
    for (const v of [prm.min, prm.max]) combos.push({ ...combos[0], [prm.id]: v });
  }
  for (const pc of p.pieces) {
    if (pc.seamAllowance === undefined || pc.seamAllowance === null) err("3 seam allowance", `${pc.name}: seam allowance is not defined.`);
    if (!(pc.quantity > 0)) err("2 geometry", `${pc.name}: quantity must be > 0.`);
    for (const c of combos) {
      try {
        const v = { ...p.constants, ...c };
        const w = evaluate(pc.width, v), h = evaluate(pc.height, v), sa = evaluate(pc.seamAllowance, v);
        if (pc.outline) {
          const d = resolveOutline(pc.outline, v, w, h);
          if (/[^MLCQAZ0-9.\-\s,]/i.test(d.replace(/e-?\d+/g, ""))) err("2 geometry", `${pc.name}: outline may only use absolute M L C Q A Z commands.`);
          const maxX = pc.onFold ? w / 2 : w;
          // check every coordinate pair (arc radii/flags are skipped)
          const nums = d.split(/[A-Za-z]/).flatMap((seg, i, all) => {
            const cmd = d.match(/[A-Za-z]/g)?.[i - 1];
            const xs = seg.trim().split(/[\s,]+/).filter(Boolean).map(Number);
            if (cmd?.toUpperCase() === "A") return xs.length >= 7 ? [xs[5], xs[6]] : [];
            void all;
            return xs;
          });
          if (nums.some((x) => !isFinite(x))) err("2 geometry", `${pc.name}: outline has invalid numbers for ${JSON.stringify(c)}.`);
          for (let k = 0; k + 1 < nums.length; k += 2) {
            if (nums[k] < -0.05 || nums[k] > maxX + 0.05 || nums[k + 1] < -0.05 || nums[k + 1] > h + 0.05) {
              err("2 geometry", `${pc.name}: outline point (${nums[k]}, ${nums[k + 1]}) lies outside its ${maxX}×${h} cut box for ${JSON.stringify(c)}.`);
              break;
            }
          }
        }
        if (!(w > 0 && h > 0)) err("2 geometry", `${pc.name}: non-positive size ${w}×${h} for ${JSON.stringify(c)}.`);
        if (!(sa >= 0 && sa * 2 < Math.min(w, h))) err("3 seam allowance", `${pc.name}: seam allowance ${sa} cm is invalid for a ${w}×${h} piece.`);
      } catch (e) {
        err("2 geometry", `${pc.name}: ${(e as Error).message}`);
      }
    }
  }

  // 4. quantities/references consistent across materials → cutting → steps
  const matIds = new Set(p.materials.map((m) => m.id));
  const pieceIds = new Set(p.pieces.map((x) => x.id));
  for (const pc of p.pieces) {
    if (!matIds.has(pc.materialId)) err("4 consistency", `${pc.name}: material "${pc.materialId}" does not exist.`);
  }
  for (const m of p.materials) {
    if ((m.kind === "fabric" || m.kind === "interfacing") && m.layout) {
      if (!p.pieces.some((x) => x.materialId === m.id)) err("4 consistency", `${m.name}: has a layout but no pattern pieces.`);
    }
    if (m.kind === "fabric" && !m.layout) err("4 consistency", `${m.name}: fabric must define a cutting layout so its quantity can be derived.`);
  }
  const usedPieces = new Set<string>();
  for (const s of p.steps) {
    for (const id of s.pieces ?? []) {
      if (!pieceIds.has(id)) err("4 consistency", `Step "${s.title}" references unknown piece "${id}".`);
      usedPieces.add(id);
    }
  }
  for (const pc of p.pieces) if (!usedPieces.has(pc.id)) err("4 consistency", `${pc.name} is cut but never used in a sewing step.`);

  // 5. cutting diagrams generated from pattern data must place every piece at default widths
  try {
    const resolved = resolvePieces(p);
    for (const m of p.materials) {
      if (!m.layout) continue;
      const pcs = resolved.filter((x) => x.materialId === m.id);
      const lay = packLayout(pcs, { fabricWidth: m.layout.defaultWidth, mode: m.layout.mode });
      if (lay.overflow.length) err("5 cutting diagram", `${m.name}: ${lay.overflow.map((o) => `${o.name} ${o.reason}`).join("; ")}.`);
      const cut = lay.placements.reduce<Record<string, number>>((a, pl) => ((a[pl.pieceId] = (a[pl.pieceId] ?? 0) + (pl.onFold ? 1 : pl.layers)), a), {});
      for (const pc of pcs) if ((cut[pc.id] ?? 0) !== pc.quantity) err("5 cutting diagram", `${pc.name}: diagram yields ${cut[pc.id] ?? 0}, pattern needs ${pc.quantity}.`);
      if (m.minWidthCm && m.layout.defaultWidth < m.minWidthCm) warn("5 cutting diagram", `${m.name}: default width below stated minimum.`);
      for (const wdt of m.layout.widths) {
        const l2 = packLayout(pcs, { fabricWidth: wdt, mode: m.layout.mode });
        if (l2.overflow.length) warn("5 cutting diagram", `${m.name}: does not fit on ${wdt} cm fabric (${m.layout.mode}) — offered width should be removed or mode changed.`);
      }
    }
  } catch (e) {
    err("5 cutting diagram", (e as Error).message);
  }

  // 6. logical construction sequence
  let prev = -1;
  p.steps.forEach((s, i) => {
    const o = STAGE_ORDER[s.stage];
    if (o === undefined) err("6 sequence", `Step ${i + 1}: unknown stage ${s.stage}.`);
    else if (o < prev) err("6 sequence", `Step ${i + 1} "${s.title}" (${s.stage}) comes after a later stage.`);
    prev = Math.max(prev, o ?? prev);
  });
  if (!p.steps.some((s) => s.stage === "cut")) err("6 sequence", "No cutting step.");
  const ids = new Set<string>();
  for (const s of p.steps) {
    if (ids.has(s.id)) err("6 sequence", `Duplicate step id ${s.id}.`);
    ids.add(s.id);
    for (const m of s.measurements ?? []) {
      try { evaluate(m.value, vars); } catch (e) { err("7 dependent measurements", `Step "${s.title}": ${(e as Error).message}`); }
    }
    for (const t of s.techniques ?? []) if (!techniques.some((x) => x.id === t)) warn("links", `Step "${s.title}" links unknown technique "${t}".`);
  }
  for (const t of p.techniques) if (!techniques.some((x) => x.id === t)) warn("links", `Unknown technique "${t}".`);

  // 8. printable patterns: every piece must resolve to finite mm geometry
  // (covered by rule 2; print view renders at exact mm via CSS physical units and a calibration square)

  // 9. every published step has a visual + alt text
  for (const [i, s] of p.steps.entries()) {
    if (s.visual.type === "missing") (p.review.status === "published" ? err : warn)("9 visuals", `Step "${s.title}" has no visual.`);
    if (!s.alt) err("9 visuals", `Step "${s.title}" has no image description.`);
    if (s.visual.type === "layout" && !matIds.has(s.visual.materialId)) err("9 visuals", `Step "${s.title}": layout for unknown material.`);
    if (s.visual.type === "scene") {
      for (const el of [...s.visual.scene.els, ...(s.visual.frames ?? []).flatMap((f) => f.els)]) {
        if (!SCENE_KINDS.has(el.k)) err("9 visuals", `Step "${s.title}": unknown scene element "${el.k}".`);
        if (el.k === "dim") { try { evaluate(el.value, vars); } catch (e) { err("7 dependent measurements", `Step "${s.title}" diagram: ${(e as Error).message}`); } }
      }
    }
    if (!s.text) err("content", `Step "${s.title || i + 1}" needs instructions.`);
    if (!s.title) err("content", `Step ${i + 1} needs a title.`);
    if (s.visual.type === "scene" && s.visual.frames) {
      if (s.visual.frames.length < 2) err("9 visuals", `Step "${s.title}": an animation needs at least 2 frames.`);
      if (s.visual.frames.some((f) => !f.caption)) err("9 visuals", `Step "${s.title}": every animation frame needs a caption.`);
    }
    if (s.video && !/^(https:\/\/|\/)/.test(s.video.src)) err("9 visuals", `Step "${s.title}": video src must be an https URL or a site path.`);
    if (s.visual.type === "photo") warn("9 visuals", `Step "${s.title}" uses a photo — photos are never a source of measurements.`);
  }

  // 10. editorial workflow
  if (p.source === "community") {
    if (!p.author) err("10 review", "Community guides need an author name.");
    warn("10 review", "Community guide — not editorially reviewed.");
  } else if (p.review.status === "published" && !p.review.reviewer) err("10 review", "Published without a named reviewer.");
  if (!p.review.technicallyValidated) warn("10 review", "Pattern dimensions have not been technically validated (test-sewn).");
  if (!p.title?.trim()) err("content", "Missing title.");
  if (!p.gallery.length) warn("9 visuals", "No finished-product illustration or photo.");

  return issues;
}
