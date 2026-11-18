import type { ProjectCard } from "./cards";
import type { State } from "./store";
import { tr, type MessageKey } from "./i18n";

const LEVEL_TO_DIFF: Record<string, string[]> = {
  beginner: ["beginner"],
  standard: ["beginner", "intermediate"],
  expert: ["intermediate", "advanced", "beginner"],
};

/** Transparent scoring: skill fit, tools owned, favourite categories, stash fit, time, and novelty. */
export function recommend(cards: ProjectCard[], s: State): { card: ProjectCard; reasons: string[] }[] {
  const completed = new Set(Object.entries(s.progress).filter(([, p]) => p.completedAt).map(([id]) => id));
  const doneDiffs = new Set(cards.filter((c) => completed.has(c.id)).map((c) => c.difficulty));
  const longestStash = Math.max(0, ...s.stash.map((f) => f.lengthCm));
  return cards
    .map((card) => {
      let score = card.popularity / 50;
      const reasons: string[] = [];
      const fits = LEVEL_TO_DIFF[s.profile.level] ?? [];
      if (fits[0] === card.difficulty) { score += 3; reasons.push(tr("discover.rec.level", { level: tr(`discover.level.${s.profile.level}` as MessageKey) })); }
      else if (fits.includes(card.difficulty)) score += 1.5;
      if (card.difficulty === "intermediate" && doneDiffs.has("beginner")) { score += 1.5; reasons.push(tr("discover.rec.nextStep")); }
      const missing = card.tools.filter((t) => ["machine", "zip-foot"].includes(t) && !s.profile.equipment.includes(t));
      if (missing.length) { score -= 4; reasons.push(tr("discover.rec.needs", { items: missing.map((m) => tr(m === "zip-foot" ? "discover.rec.needZipFoot" : "discover.rec.needMachine")).join(", ") })); }
      else if (card.machineRequired) reasons.push(tr("discover.rec.haveTools"));
      if (s.profile.favCategories.includes(card.category) || card.tags.some((t) => s.profile.favCategories.includes(t))) { score += 2; reasons.push(tr("discover.rec.category")); }
      if (longestStash && card.fabricCm <= longestStash) { score += 1.5; reasons.push(tr("discover.rec.stash")); }
      if (s.profile.timeAvailable && card.minutes[1] <= s.profile.timeAvailable) { score += 1; reasons.push(tr("discover.rec.time")); }
      if (completed.has(card.id)) score -= 6;
      if (s.progress[card.id] && !completed.has(card.id)) score -= 2; // already in progress → shown in Continue
      if (s.favorites.includes(card.id)) { score += 1; reasons.push(tr("discover.rec.fav")); }
      return { card, score, reasons: reasons.slice(0, 2) };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ card, reasons }) => ({ card, reasons }));
}
