"use client";
import { useMemo } from "react";
import { normalizeProject, type ToolCatalog } from "./normalize";
import { useStore, type LocalGuide } from "./store";
import { tr, useLang } from "./i18n";
import type { Project, Scene } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A default finished-item illustration for guides that don't draw their own. */
export function placeholderGallery(raw: any): { label: string; scene: Scene }[] {
  const tone = raw.materials?.find((m: any) => m && typeof m === "object" && m.kind === "fabric")?.id ?? "a";
  return [{ label: tr("community.illustration"), scene: { els: [
    { k: "panel", x: 110, y: 70, w: 180, h: 170, tone, rx: 10 },
    { k: "stitch", pts: [[122, 82], [278, 82], [278, 228], [122, 228]], closed: true },
    { k: "label", x: 200, y: 275, text: tr("community.illustrationGeneric"), anchor: "middle" },
  ] } }];
}

export function guideToProject(g: LocalGuide, catalog: ToolCatalog): { project: Project; issues: string[] } {
  const raw = { ...g.raw, source: "community", local: true };
  if (!raw.gallery?.length) raw.gallery = placeholderGallery(raw);
  return normalizeProject(raw, catalog);
}

export function useLocalGuide(id: string | null, catalog: ToolCatalog): Project | null {
  const g = useStore((s) => (id ? s.guides[id] : undefined));
  const lang = useLang(); // placeholder illustration text follows the UI language
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (g ? guideToProject(g, catalog).project : null), [g, catalog, lang]);
}

export function newGuideRaw(): any {
  const id = `local-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id, title: "", summary: "", description: "", author: "", category: "gifts", difficulty: "beginner",
    minutes: [60, 90], costUSD: [5, 15], machineRequired: true, tags: [], constants: { sa: 1 },
    tools: ["machine", "scissors", "pins", "iron"],
    materials: [
      { id: "main", name: tr("community.defMainFabric"), kind: "fabric", required: true, recommended: ["Quilting cotton"], why: tr("community.defMainWhy"), swatch: "#C26A4E", layout: { mode: "single", defaultWidth: 112, widths: [112, 140] } },
      "thread",
    ],
    pieces: [], steps: [],
    review: { status: "published", technicallyValidated: false, updated: new Date().toISOString().slice(0, 10) },
  };
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
