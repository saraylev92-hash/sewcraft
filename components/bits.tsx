"use client";
import type { Difficulty, Stage } from "@/lib/types";
import { tr, useT, type MessageKey } from "@/lib/i18n";

export function DifficultyBadge({ d }: { d: Difficulty }) {
  const t = useT();
  const map = {
    beginner: "bg-sage-soft text-[#4c6142]",
    intermediate: "bg-[#f6ead3] text-[#7a5520]",
    advanced: "bg-terra-soft text-[#8a3a22]",
  } as const;
  return <span className={`chip !text-[11px] uppercase tracking-wide ${map[d]}`}>{t(`discover.diff.${d}`)}</span>;
}

export function formatMinutes([a, b]: [number, number]) {
  const f = (m: number) => (m < 60 ? tr("discover.time.min", { n: m }) : tr("discover.time.h", { n: +(m / 60).toFixed(1) }));
  if (a === b) return f(a);
  if (b < 60) return tr("discover.time.rangeMin", { a, b });
  if (a >= 60) return tr("discover.time.rangeH", { a: +(a / 60).toFixed(1), b: +(b / 60).toFixed(1) });
  return `${f(a)}–${f(b)}`;
}

function stage(id: Stage | "assemble", key: MessageKey, icon: string) {
  // `label` is resolved on access so it follows the current UI language.
  return { id, key, icon, get label() { return tr(key); } };
}

export const STAGES = [
  stage("prep", "discover.stage.prep", "◎"),
  stage("cut", "discover.stage.cut", "✂"),
  stage("sew", "discover.stage.sew", "⋯"),
  stage("assemble", "discover.stage.assemble", "▣"),
  stage("finish", "discover.stage.finish", "✦"),
];

export function stageLabel(s: Stage) {
  return STAGES.find((x) => x.id === s)?.label ?? s;
}

export function SectionHeading({ title, sub, action }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold md:text-[1.7rem]">{title}</h2>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
