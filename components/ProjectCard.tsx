"use client";
import Link from "next/link";
import type { ProjectCard as Card } from "@/lib/cards";
import { toggleFavorite, useStore } from "@/lib/store";
import { useLang, useT } from "@/lib/i18n";
import { cardText } from "@/lib/cards";
import { fabricAmount } from "@/lib/units";
import SceneView from "./scene/SceneView";
import { projectHref } from "@/lib/paths";
import { IconClock, IconHeart, IconMachine } from "./icons";
import { DifficultyBadge, formatMinutes } from "./bits";

export type CardLike = Card;

export default function ProjectCard({ card: raw, size = "md", progress }: { card: CardLike; size?: "md" | "lg"; progress?: { pct: number; step: number } }) {
  const t = useT();
  const lang = useLang();
  const card = { ...raw, ...cardText(raw, lang) };
  const units = useStore((s) => s.profile.units);
  const fav = useStore((s) => s.favorites.includes(card.id));
  const prog = useStore((s) => s.progress[card.id]);
  const status = !progress && prog ? (prog.completedAt ? t("discover.card.made") : t("discover.card.inProgress", { pct: Math.round((prog.done.length / Math.max(1, card.steps)) * 100) })) : null;
  const g = card.gallery[0];
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(43,38,34,0.45)]">
      <Link href={projectHref(card)} className="absolute inset-0 z-10" aria-label={card.title} />
      <div className={`relative ${size === "lg" ? "aspect-[4/3]" : "aspect-[4/3]"} bg-[var(--canvas)]`}>
        {card.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.cover} alt={t("discover.card.photoAlt", { title: card.title })} className="h-full w-full object-cover" />
        ) : g && <SceneView scene={g.scene} tones={card.tones} vars={{}} units={units} title={t("discover.card.illustrationAlt", { title: card.title })} className="h-full w-full [&>svg]:h-full" />}
        <button
          onClick={(e) => { e.preventDefault(); toggleFavorite(card.id, card.title); }}
          className={`absolute end-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-paper/90 shadow ${fav ? "text-terra" : "text-ink-soft"}`}
          aria-pressed={fav}
          aria-label={fav ? t("discover.card.unfav", { title: card.title }) : t("discover.card.fav", { title: card.title })}
        >
          <IconHeart filled={fav} />
        </button>
        {card.source === "community" && <span className="absolute start-3 top-3 z-20 chip !bg-sage !text-white !text-[11px]">{t("nav.community")}</span>}
        {status && <span className={`absolute bottom-3 start-3 z-20 chip !text-[11px] shadow ${prog?.completedAt ? "!bg-sage !text-white" : "!bg-paper"}`}>{status}</span>}
        {progress && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/10"><div className="h-full bg-terra" style={{ width: `${progress.pct}%` }} /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs">
          <DifficultyBadge d={card.difficulty} />
          <span className="inline-flex items-center gap-1 text-ink-soft"><IconClock size={14} />{formatMinutes(card.minutes)}</span>
          {!card.machineRequired && <span className="text-ink-soft">{t("discover.card.handOk")}</span>}
        </div>
        <h3 className={`font-display font-semibold leading-tight ${size === "lg" ? "text-xl" : "text-lg"}`}>{card.title}</h3>
        {size === "lg" && <p className="line-clamp-2 text-sm text-ink-soft">{card.summary}</p>}
        {card.source === "community" && card.author && <p className="text-xs text-ink-soft">{t("discover.card.by", { author: card.author })}</p>}
        <p className="mt-auto flex items-center gap-1.5 text-xs text-ink-soft">
          {card.machineRequired && <IconMachine size={14} />}
          {progress ? t("discover.card.step", { step: progress.step, n: card.steps }) : t("discover.card.fabricMaterials", { amount: fabricAmount(card.fabricCm, units), n: card.materials.filter((m) => m.kind !== "thread").length })}
        </p>
      </div>
    </article>
  );
}
