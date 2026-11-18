"use client";
import type { Step } from "@/lib/types";
import type { MaterialNeed } from "@/lib/needs";
import type { Units } from "@/lib/types";
import SceneView from "../scene/SceneView";
import LayoutView from "../LayoutView";
import type { Skin } from "@/lib/fabrics";
import { useT, type MessageKey } from "@/lib/i18n";

/** Message key for a guide stage label (Preparation, Measuring & Cutting, …). */
export function stageMsg(stage: string): MessageKey {
  return `project.stage.${stage === "prep" || stage === "cut" || stage === "sew" || stage === "assemble" || stage === "finish" ? stage : "sew"}` as MessageKey;
}

export default function StepVisual({ step, tones, vars, units, needs, contrast, compact, legend, skins }: {
  step: Step; tones: Record<string, string>; vars: Record<string, number>; units: Units; needs: MaterialNeed[]; contrast?: boolean; compact?: boolean; legend?: boolean; skins?: Record<string, Skin>;
}) {
  const t = useT();
  const v = step.visual;
  if (v.type === "scene") return <SceneView scene={v.scene} tones={tones} vars={vars} units={units} title={step.alt} contrast={contrast} legend={legend} skins={skins} />;
  if (v.type === "layout") {
    const n = needs.find((x) => x.material.id === v.materialId);
    if (!n) return <Missing />;
    return (
      <div>
        <LayoutView layout={n.need.layout} units={units} swatch={n.material.swatch} compact={compact} title={step.alt} skin={skins?.[n.material.id]} />
        {!compact && null}
      </div>
    );
  }
  if (v.type === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <figure><img src={v.src} alt={step.alt} className="aspect-[4/3] w-full rounded-xl object-cover" /><figcaption className="px-3 py-2 text-xs text-ink-soft">{t("project.visual.photoCaption")}</figcaption></figure>;
  }
  return <Missing />;
}

function Missing() {
  const t = useT();
  return (
    <div className="grid aspect-[4/3] place-items-center rounded-xl border-2 border-dashed border-line bg-paper p-6 text-center text-sm text-ink-soft" role="img" aria-label={t("project.visual.missingAria")}>
      {t("project.visual.missing1")}<br />{t("project.visual.missing2")}
    </div>
  );
}
