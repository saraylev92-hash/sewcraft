"use client";
import Link from "next/link";
import { cardText, type ProjectCard as Card } from "@/lib/cards";
import { getState, useHydrated, useStore } from "@/lib/store";
import { recommend } from "@/lib/recommend";
import ProjectCard from "./ProjectCard";
import SceneView from "./scene/SceneView";
import { SectionHeading } from "./bits";
import { useMemo } from "react";
import { toCard } from "@/lib/cards";
import { guideToProject } from "@/lib/localGuides";
import type { ToolCatalog } from "@/lib/normalize";
import { sewHref } from "@/lib/paths";
import { useLang, useT } from "@/lib/i18n";

export default function HomePersonal({ cards: published, catalog }: { cards: Card[]; catalog: ToolCatalog }) {
  const t = useT();
  const lang = useLang();
  const hydrated = useHydrated();
  const guides = useStore((s) => s.guides);
  const cards = useMemo(() => [...published, ...Object.values(guides).map((g) => toCard(guideToProject(g, catalog).project))], [published, guides, catalog]);
  const progress = useStore((s) => s.progress);
  // recompute when profile/favourites/stash change
  useStore((s) => s.profile);
  useStore((s) => s.favorites);
  useStore((s) => s.stash);
  if (!hydrated) return (
    <section aria-hidden>
      <div className="skeleton mb-4 h-8 w-64" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[4/3.6]" />)}</div>
    </section>
  );

  const inProgress = Object.entries(progress)
    .filter(([id, p]) => !p.completedAt && cards.some((c) => c.id === id))
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([id, p]) => ({ card: cards.find((c) => c.id === id)!, p }));

  const recs = recommend(published, getState()).slice(0, 3);

  return (
    <>
      {inProgress.length > 0 && (
        <section>
          <SectionHeading title={t("discover.home.continue")} sub={t("discover.home.continueSub")} />
          <div className="grid gap-4 md:grid-cols-2">
            {inProgress.map(({ card, p }) => {
              const pct = Math.round((p.done.length / card.steps) * 100);
              return (
                <div key={card.id} className="card flex items-center gap-4 p-4">
                  <div className="w-28 shrink-0"><ProjectCardMini card={card} /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold">{cardText(card, lang).title}</h3>
                    <p className="text-sm text-ink-soft">{t("discover.home.progress", { step: p.current + 1, n: card.steps, pct })}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige"><div className="h-full rounded-full bg-terra" style={{ width: `${pct}%` }} /></div>
                  </div>
                  <Link href={sewHref(card)} className="btn btn-primary">{t("discover.home.resume")}</Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section>
        <SectionHeading title={t("discover.home.recommended")} sub={t("discover.home.recommendedSub")} action={<Link href="/studio?tab=setup" className="text-sm font-semibold text-terra">{t("discover.home.adjust")}</Link>} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recs.map(({ card, reasons }) => (
            <div key={card.id} className="flex flex-col gap-2">
              <ProjectCard card={card} />
              {reasons.length > 0 && <p className="px-1 text-xs text-ink-soft">{reasons.join(" · ")}</p>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ProjectCardMini({ card }: { card: Card }) {
  const units = useStore((s) => s.profile.units);
  const g = card.gallery[0];
  return g ? <SceneView scene={g.scene} tones={card.tones} vars={{}} units={units} title="" className="overflow-hidden rounded-xl" /> : null;
}
