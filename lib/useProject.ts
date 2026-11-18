"use client";
import { useMemo } from "react";
import type { Project } from "./types";
import { EMPTY_PREFS, useStore, withPrefs } from "./store";
import { resolvePieces, sanitizeParams, vars as mkVars } from "./resolve";
import { materialNeeds } from "./needs";
import { toneMap } from "./color";
import { resolveSkins } from "./fabrics";

/** Everything a project screen needs, derived from definition + this user's choices. */
export function useProject(p: Project) {
  const prefs = useStore((s) => s.prefs[p.id]) ?? EMPTY_PREFS;
  const units = useStore((s) => s.profile.units);
  const level = useStore((s) => s.profile.level);
  const contrast = useStore((s) => s.profile.contrast);

  const params = useMemo(() => sanitizeParams(p, prefs.params), [p, prefs.params]);
  const v = useMemo(() => mkVars(p, params), [p, params]);
  const pieces = useMemo(() => resolvePieces(p, params), [p, params]);
  const needs = useMemo(() => materialNeeds(p, params, prefs.layout), [p, params, prefs.layout]);
  const stash = useStore((s) => s.stash);
  const skins = useMemo(() => resolveSkins(p, prefs.fabrics, stash), [p, prefs.fabrics, stash]);
  const tones = useMemo(() => {
    const t = toneMap(p);
    for (const k of Object.keys(skins)) t[k] = skins[k].avg;
    return t;
  }, [p, skins]);
  const custom = p.params.some((x) => params[x.id] !== x.default);

  return {
    prefs, units, level, contrast, params, vars: v, pieces, needs, tones, skins, custom,
    setParam: (id: string, value: number) => withPrefs(p.id, (x) => { x.params = { ...sanitizeParams(p, x.params), [id]: value }; x.sizeId = undefined; }),
    setSize: (sizeId: string) => withPrefs(p.id, (x) => { const s = p.sizes.find((z) => z.id === sizeId); if (s) { x.params = { ...s.values }; x.sizeId = sizeId; } }),
    resetSize: () => withPrefs(p.id, (x) => { x.params = undefined; x.sizeId = undefined; }),
    setLayout: (materialId: string, patch: { width?: number; mode?: "folded" | "single"; directional?: boolean; shrink?: number }) =>
      withPrefs(p.id, (x) => { x.layout[materialId] = { ...x.layout[materialId], ...patch }; }),
    setCheck: (itemId: string, v: "have" | "skip" | "need" | null) =>
      withPrefs(p.id, (x) => { if (v) x.checklist[itemId] = v; else delete x.checklist[itemId]; }),
  };
}
