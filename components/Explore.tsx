"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectCard as Card } from "@/lib/cards";
import type { Category, Project } from "@/lib/types";
import { fitsFabric } from "@/lib/needs";
import { useStore } from "@/lib/store";
import { boltWidth, fabricAmount } from "@/lib/units";
import ProjectCard from "./ProjectCard";
import { POPULAR_SEARCHES } from "./HeroSearch";
import { IconFilter, IconSearch, IconX } from "./icons";
import { useT, type MessageKey } from "@/lib/i18n";

type FabricProject = Pick<Project, "id" | "title" | "materials" | "pieces" | "constants" | "params">;

// Values are matched against the English guide content; `key` is the label shown in the UI.
const FABRIC_TYPES: { v: string; key: MessageKey }[] = [
  { v: "Canvas", key: "discover.fabric.canvas" },
  { v: "Quilting cotton", key: "discover.fabric.quilting" },
  { v: "Linen", key: "discover.fabric.linen" },
  { v: "Denim", key: "discover.fabric.denim" },
  { v: "Twill", key: "discover.fabric.twill" },
  { v: "Rayon", key: "discover.fabric.rayon" },
  { v: "Lawn", key: "discover.fabric.lawn" },
  { v: "Nylon", key: "discover.fabric.nylon" },
];
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

function matches(c: Card, q: string) {
  if (!q) return true;
  const hay = [c.title, c.summary, c.he?.title ?? "", c.he?.summary ?? "", c.category, ...c.tags, ...c.techniques, c.difficulty, ...c.materials.flatMap((m) => [m.name, ...(m.recommended ?? [])])].join(" ").toLowerCase();
  if (/under\s*(\d)\s*hours?/.test(q)) return c.minutes[1] <= Number(q.match(/(\d)/)![1]) * 60;
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w.replace(/s$/, "")));
}

export default function Explore({ cards, categories, fabricProjects }: { cards: Card[]; categories: Category[]; fabricProjects: FabricProject[] }) {
  const t = useT();
  const sp = useSearchParams();
  const router = useRouter();
  const units = useStore((s) => s.profile.units);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [cat, setCat] = useState<string | null>(sp.get("cat"));
  const [diff, setDiff] = useState<string[]>([]);
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [machine, setMachine] = useState<"any" | "machine" | "hand">("any");
  const [fabricType, setFabricType] = useState("");
  const [haveCm, setHaveCm] = useState<number | null>(null);
  const [sort, setSort] = useState(sp.get("sort") ?? "relevance");
  const [source, setSource] = useState<"all" | "editorial" | "community">((sp.get("source") as "community") ?? "all");
  const [focus, setFocus] = useState(false);
  const [showFinder, setShowFinder] = useState(false);
  const [sheet, setSheet] = useState(false);
  const qRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (sp.get("focus")) qRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(el.tagName)) { e.preventDefault(); qRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sp]);

  const results = useMemo(() => {
    const r = cards.filter((c) =>
      matches(c, q) &&
      (!cat || c.category === cat || c.tags.includes(cat) || (cat === "beginner" && c.difficulty === "beginner")) &&
      (!diff.length || diff.includes(c.difficulty)) &&
      (!maxTime || c.minutes[1] <= maxTime) &&
      (machine === "any" || (machine === "hand" ? !c.machineRequired : c.machineRequired)) &&
      (!fabricType || c.materials.some((m) => (m.recommended ?? []).some((r) => r.toLowerCase().includes(fabricType.toLowerCase())))) &&
      (!haveCm || c.fabricCm <= haveCm) &&
      (source === "all" || c.source === source),
    );
    if (sort === "popular") r.sort((a, b) => b.popularity - a.popularity);
    if (sort === "quick") r.sort((a, b) => a.minutes[0] - b.minutes[0]);
    if (sort === "easy") r.sort((a, b) => ["beginner", "intermediate", "advanced"].indexOf(a.difficulty) - ["beginner", "intermediate", "advanced"].indexOf(b.difficulty));
    return r;
  }, [cards, q, cat, diff, maxTime, machine, fabricType, haveCm, sort, source]);

  const suggestions = useMemo(() => {
    if (!q) return [];
    const ql = q.toLowerCase();
    const s = new Set<string>();
    cards.forEach((c) => { if (c.title.toLowerCase().includes(ql)) s.add(c.title); c.tags.forEach((tag) => tag.includes(ql) && s.add(tag)); });
    categories.forEach((c) => c.name.toLowerCase().includes(ql) && s.add(c.name));
    return [...s].slice(0, 6);
  }, [q, cards, categories]);

  const activeCount = [cat, diff.length, maxTime, machine !== "any", fabricType, haveCm, source !== "all"].filter(Boolean).length;
  const clear = () => { setSource("all"); setCat(null); setDiff([]); setMaxTime(null); setMachine("any"); setFabricType(""); setHaveCm(null); setQ(""); router.replace("/explore"); };

  const filterBody = (
<div className="space-y-5 text-sm">
              <fieldset>
                <legend className="mb-2 font-semibold">{t("discover.explore.difficulty")}</legend>
                <div className="flex flex-wrap gap-2">
                  {["beginner", "intermediate", "advanced"].map((d) => (
                    <button key={d} className="chip chip-toggle capitalize" aria-pressed={diff.includes(d)} onClick={() => setDiff((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}>{t(`discover.diff.${d}` as MessageKey)}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">{t("discover.explore.time")}</legend>
                <div className="flex flex-wrap gap-2">
                  {[[90, "1.5"], [120, "2"], [180, "3"]].map(([m, l]) => (
                    <button key={m} className="chip chip-toggle" aria-pressed={maxTime === m} onClick={() => setMaxTime(maxTime === m ? null : (m as number))}>{t("discover.explore.upTo", { h: l })}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">{t("discover.explore.machineLabel")}</legend>
                <div className="flex flex-wrap gap-2">
                  {([["any", "discover.explore.any"], ["machine", "discover.explore.machine"], ["hand", "discover.explore.hand"]] as const).map(([v, l]) => (
                    <button key={v} className="chip chip-toggle" aria-pressed={machine === v} onClick={() => setMachine(v)}>{t(l)}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">{t("discover.explore.guides")}</legend>
                <div className="flex flex-wrap gap-2">
                  {([["all", "discover.explore.all"], ["editorial", "discover.explore.editorialLong"], ["community", "nav.community"]] as const).map(([v, l]) => (
                    <button key={v} className="chip chip-toggle" aria-pressed={source === v} onClick={() => setSource(v)}>{t(l)}</button>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="mb-2 block font-semibold">{t("discover.explore.fabricType")}</span>
                <select className="input" value={fabricType} onChange={(e) => setFabricType(e.target.value)}>
                  <option value="">{t("discover.explore.anyFabric")}</option>
                  {FABRIC_TYPES.map((f) => <option key={f.v} value={f.v}>{t(f.key)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block font-semibold">{t("discover.explore.fabricHave")}</span>
                <select className="input" value={haveCm ?? ""} onChange={(e) => setHaveCm(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">{t("discover.explore.anyAmount")}</option>
                  {[30, 50, 75, 100, 150].map((c) => <option key={c} value={c}>{t("discover.explore.upToAmount", { amount: fabricAmount(c, units) })}</option>)}
                </select>
              </label>
              <p className="text-xs text-ink-soft">{t("discover.explore.free")}</p>
              {activeCount > 0 && <button onClick={clear} className="btn btn-ghost w-full">{t("discover.explore.clearAll")}</button>}
            </div>
  );

  const chips: { label: string; clear: () => void }[] = [
    ...(cat ? [{ label: categories.find((c) => c.id === cat)?.name ?? cat, clear: () => setCat(null) }] : []),
    ...diff.map((d) => ({ label: cap(t(`discover.diff.${d}` as MessageKey)), clear: () => setDiff((x) => x.filter((y) => y !== d)) })),
    ...(maxTime ? [{ label: t("discover.explore.upTo", { h: maxTime / 60 }), clear: () => setMaxTime(null) }] : []),
    ...(machine !== "any" ? [{ label: machine === "hand" ? t("discover.explore.hand") : t("discover.explore.machine"), clear: () => setMachine("any") }] : []),
    ...(source !== "all" ? [{ label: source === "community" ? t("nav.community") : t("discover.explore.editorial"), clear: () => setSource("all") }] : []),
    ...(fabricType ? [{ label: t(FABRIC_TYPES.find((f) => f.v === fabricType)?.key ?? "discover.explore.anyFabric"), clear: () => setFabricType("") }] : []),
    ...(haveCm ? [{ label: t("discover.explore.chipFabric", { amount: fabricAmount(haveCm, units) }), clear: () => setHaveCm(null) }] : []),
  ];


  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">{t("discover.explore.title")}</h1>

      <div className="relative mt-5">
        <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4">
          <IconSearch className="text-ink-soft" />
          <label htmlFor="q" className="sr-only">{t("shell.search")}</label>
          <input id="q" ref={qRef} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
            placeholder={t("discover.explore.placeholder")} title={t("discover.explore.searchHint")} className="min-h-[52px] flex-1 bg-transparent outline-none" role="combobox" aria-expanded={focus && (suggestions.length > 0 || !q)} aria-controls="q-sugg" autoComplete="off" />
          {q && <button onClick={() => setQ("")} aria-label={t("discover.explore.clearSearch")} className="btn-icon"><IconX size={16} /></button>}
        </div>
        {focus && (suggestions.length > 0 || !q) && (
          <ul id="q-sugg" role="listbox" className="card absolute inset-x-0 top-full z-20 mt-2 overflow-hidden p-2 shadow-lg">
            {(q ? suggestions.map((s) => ({ q: s, label: s })) : POPULAR_SEARCHES.map((s) => ({ q: s.q, label: t(s.key) }))).map((s) => (
              <li key={s.q} role="option" aria-selected={false}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(s.q); setFocus(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start hover:bg-beige">
                  <IconSearch size={14} className="text-ink-soft" />{s.label}{!q && <span className="ms-auto text-xs text-ink-soft">{t("discover.search.popularTag")}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button className="chip chip-toggle" aria-pressed={!cat} onClick={() => setCat(null)}>{t("discover.explore.all")}</button>
        {categories.map((c) => (
          <button key={c.id} className="chip chip-toggle shrink-0" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>{c.name}</button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden space-y-5 lg:block" aria-label={t("discover.explore.filters")}>
          <div className="card p-4">
            <p className="mb-4 font-semibold">{t("discover.explore.filters")} {activeCount > 0 && <span className="chip ms-1 !bg-terra !text-white">{activeCount}</span>}</p>
            {filterBody}
          </div>
          <button onClick={() => setShowFinder((v) => !v)} aria-expanded={showFinder} className="card w-full p-4 text-start">
            <span className="font-semibold">{t("discover.explore.finderTitle")}</span>
            <span className="mt-1 block text-sm text-ink-soft">{t("discover.explore.finderBody")}</span>
          </button>
          {showFinder && <FabricFinder projects={fabricProjects} cards={cards} />}
        </aside>

        <section>
          <div className="mb-3 flex gap-2 lg:hidden">
            <button className="btn btn-secondary flex-1" onClick={() => setSheet(true)} aria-haspopup="dialog"><IconFilter size={18} />{t("discover.explore.filters")}{activeCount > 0 && <span className="chip !bg-terra !text-white !px-2">{activeCount}</span>}</button>
            <button className="btn btn-secondary flex-1" onClick={() => setShowFinder((v) => !v)} aria-expanded={showFinder}>{t("discover.explore.myFabric")}</button>
          </div>
          {showFinder && <div className="mb-4 lg:hidden"><FabricFinder projects={fabricProjects} cards={cards} /></div>}
          {chips.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2" aria-label={t("discover.explore.activeFilters")}>
              {chips.map((c) => <button key={c.label} onClick={c.clear} className="chip !bg-ink !text-cream" aria-label={t("discover.explore.removeFilter", { label: c.label })}>{c.label}<IconX size={12} /></button>)}
              <button onClick={clear} className="text-sm font-semibold text-terra">{t("discover.explore.clearAll")}</button>
            </div>
          )}
          <div className="mb-4 flex items-center justify-between gap-3" aria-live="polite">
            <p className="text-sm text-ink-soft">{results.length === 1 ? t("discover.count.projectsOne") : t("discover.count.projectsMany", { n: results.length })}{q && <>{t("discover.explore.forQuery", { q })}</>}</p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink-soft">{t("discover.explore.sort")}</span>
              <select className="input !min-h-[38px] !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">{t("discover.explore.sortRelevance")}</option>
                <option value="popular">{t("discover.explore.sortPopular")}</option>
                <option value="quick">{t("discover.explore.sortQuick")}</option>
                <option value="easy">{t("discover.explore.sortEasy")}</option>
              </select>
            </label>
          </div>
          {results.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((c) => <ProjectCard key={c.id} card={c} />)}</div>
          ) : (
            <div className="card p-10 text-center">
              <p className="font-display text-xl">{t("discover.explore.emptyTitle")}</p>
              <p className="mt-2 text-sm text-ink-soft">{t("discover.explore.emptyBody")}</p>
              <button onClick={clear} className="btn btn-secondary mt-4">{t("discover.explore.reset")}</button>
            </div>
          )}
        </section>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("discover.explore.filters")} onClick={() => setSheet(false)}>
          <div className="sheet-up max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 pb-0" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" aria-hidden />
            <div className="mb-4 flex items-center justify-between"><p className="font-display text-xl font-semibold">{t("discover.explore.filters")}</p><button className="btn-icon" onClick={() => setSheet(false)} aria-label={t("discover.explore.closeFilters")} autoFocus><IconX size={16} /></button></div>
            {filterBody}
            <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line bg-paper p-4">
              <button className="btn btn-primary w-full" onClick={() => setSheet(false)}>{results.length === 1 ? t("discover.explore.showOne") : t("discover.explore.showMany", { n: results.length })}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FabricFinder({ projects, cards }: { projects: FabricProject[]; cards: Card[] }) {
  const t = useT();
  const units = useStore((s) => s.profile.units);
  const stash = useStore((s) => s.stash);
  const [type, setType] = useState("");
  const [width, setWidth] = useState(112);
  const [lengthCm, setLengthCm] = useState(100);
  const f = units === "imperial" ? 2.54 : 1;

  const res = projects.map((p) => {
    const r = fitsFabric(p as Project, width, lengthCm, type);
    const usable = r.filter((x) => x.fits && x.typeOk);
    return { p, r, usable };
  }).filter((x) => x.usable.length > 0);

  return (
    <div className="card space-y-3 p-4 text-sm">
      {stash.length > 0 && (
        <label className="block">
          <span className="mb-1 block font-semibold">{t("discover.explore.fromStash")}</span>
          <select className="input" onChange={(e) => { const s = stash.find((x) => x.id === e.target.value); if (s) { setType(s.type); setWidth(s.widthCm); setLengthCm(s.lengthCm); } }}>
            <option value="">{t("discover.explore.chooseFabric")}</option>
            {stash.map((s) => <option key={s.id} value={s.id}>{s.color} {s.type} — {fabricAmount(s.lengthCm, units)}</option>)}
          </select>
        </label>
      )}
      <label className="block"><span className="mb-1 block font-semibold">{t("discover.explore.fabricType")}</span>
        <input className="input" list="ftypes" value={type} onChange={(e) => setType(e.target.value)} placeholder={t("discover.explore.fabricPlaceholder")} />
        <datalist id="ftypes">{FABRIC_TYPES.map((f) => <option key={f.v} value={f.v}>{t(f.key)}</option>)}</datalist>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label><span className="mb-1 block font-semibold">{t("discover.explore.width", { unit: t(units === "imperial" ? "discover.unit.in" : "discover.unit.cm") })}</span>
          <input className="input" type="number" min={20} value={Math.round(width / f)} onChange={(e) => setWidth(Number(e.target.value) * f)} /></label>
        <label><span className="mb-1 block font-semibold">{t("discover.explore.length", { unit: t(units === "imperial" ? "discover.unit.in" : "discover.unit.cm") })}</span>
          <input className="input" type="number" min={10} value={Math.round(lengthCm / f)} onChange={(e) => setLengthCm(Number(e.target.value) * f)} /></label>
      </div>
      <p className="text-xs text-ink-soft">{t("discover.explore.finderNote", { width: boltWidth(width, units), length: fabricAmount(lengthCm, units) })}</p>
      <ul className="space-y-2">
        {res.length === 0 && <li className="text-ink-soft">{t("discover.explore.finderNone")}</li>}
        {res.map(({ p, usable }) => (
          <li key={p.id}>
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/projects/${p.id}/`} className="block rounded-xl bg-sage-soft p-3 hover:bg-[#d9e3d1]">
              <span className="font-semibold">{cards.find((c) => c.id === p.id)?.title ?? p.title}</span>
              <span className="block text-xs text-ink-soft">{t("discover.explore.covers", { list: usable.map((u) => `${u.material.name.split("—")[0].trim()} (${fabricAmount(u.need!.totalCm, units)})`).join(", ") })}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
