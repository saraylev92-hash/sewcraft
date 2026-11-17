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

type FabricProject = Pick<Project, "id" | "title" | "materials" | "pieces" | "constants" | "params">;

const FABRIC_TYPES = ["Canvas", "Quilting cotton", "Linen", "Denim", "Twill", "Rayon", "Lawn", "Nylon"];

function matches(c: Card, q: string) {
  if (!q) return true;
  const hay = [c.title, c.summary, c.category, ...c.tags, ...c.techniques, c.difficulty, ...c.materials.flatMap((m) => [m.name, ...(m.recommended ?? [])])].join(" ").toLowerCase();
  if (/under\s*(\d)\s*hours?/.test(q)) return c.minutes[1] <= Number(q.match(/(\d)/)![1]) * 60;
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w.replace(/s$/, "")));
}

export default function Explore({ cards, categories, fabricProjects }: { cards: Card[]; categories: Category[]; fabricProjects: FabricProject[] }) {
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
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) { e.preventDefault(); qRef.current?.focus(); }
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
    cards.forEach((c) => { if (c.title.toLowerCase().includes(ql)) s.add(c.title); c.tags.forEach((t) => t.includes(ql) && s.add(t)); });
    categories.forEach((c) => c.name.toLowerCase().includes(ql) && s.add(c.name));
    return [...s].slice(0, 6);
  }, [q, cards, categories]);

  const activeCount = [cat, diff.length, maxTime, machine !== "any", fabricType, haveCm, source !== "all"].filter(Boolean).length;
  const clear = () => { setSource("all"); setCat(null); setDiff([]); setMaxTime(null); setMachine("any"); setFabricType(""); setHaveCm(null); setQ(""); router.replace("/explore"); };

  const filterBody = (
<div className="space-y-5 text-sm">
              <fieldset>
                <legend className="mb-2 font-semibold">Difficulty</legend>
                <div className="flex flex-wrap gap-2">
                  {["beginner", "intermediate", "advanced"].map((d) => (
                    <button key={d} className="chip chip-toggle capitalize" aria-pressed={diff.includes(d)} onClick={() => setDiff((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}>{d}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">Time</legend>
                <div className="flex flex-wrap gap-2">
                  {[[90, "≤ 1.5 h"], [120, "≤ 2 h"], [180, "≤ 3 h"]].map(([m, l]) => (
                    <button key={m} className="chip chip-toggle" aria-pressed={maxTime === m} onClick={() => setMaxTime(maxTime === m ? null : (m as number))}>{l}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">Sewing machine</legend>
                <div className="flex flex-wrap gap-2">
                  {([["any", "Any"], ["machine", "Machine"], ["hand", "Hand-sewing"]] as const).map(([v, l]) => (
                    <button key={v} className="chip chip-toggle" aria-pressed={machine === v} onClick={() => setMachine(v)}>{l}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">Guides</legend>
                <div className="flex flex-wrap gap-2">
                  {([["all", "All"], ["editorial", "SewCraft editorial"], ["community", "Community"]] as const).map(([v, l]) => (
                    <button key={v} className="chip chip-toggle" aria-pressed={source === v} onClick={() => setSource(v)}>{l}</button>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="mb-2 block font-semibold">Fabric type</span>
                <select className="input" value={fabricType} onChange={(e) => setFabricType(e.target.value)}>
                  <option value="">Any fabric</option>
                  {FABRIC_TYPES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block font-semibold">Fabric I have</span>
                <select className="input" value={haveCm ?? ""} onChange={(e) => setHaveCm(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Any amount</option>
                  {[30, 50, 75, 100, 150].map((c) => <option key={c} value={c}>up to {fabricAmount(c, units)}</option>)}
                </select>
              </label>
              <p className="text-xs text-ink-soft">Free vs premium patterns: all MVP patterns are free.</p>
              {activeCount > 0 && <button onClick={clear} className="btn btn-ghost w-full">Clear all</button>}
            </div>
  );

  const chips: { label: string; clear: () => void }[] = [
    ...(cat ? [{ label: categories.find((c) => c.id === cat)?.name ?? cat, clear: () => setCat(null) }] : []),
    ...diff.map((d) => ({ label: d[0].toUpperCase() + d.slice(1), clear: () => setDiff((x) => x.filter((y) => y !== d)) })),
    ...(maxTime ? [{ label: `≤ ${maxTime / 60} h`, clear: () => setMaxTime(null) }] : []),
    ...(machine !== "any" ? [{ label: machine === "hand" ? "Hand-sewing" : "Machine", clear: () => setMachine("any") }] : []),
    ...(source !== "all" ? [{ label: source === "community" ? "Community" : "Editorial", clear: () => setSource("all") }] : []),
    ...(fabricType ? [{ label: fabricType, clear: () => setFabricType("") }] : []),
    ...(haveCm ? [{ label: `≤ ${fabricAmount(haveCm, units)} fabric`, clear: () => setHaveCm(null) }] : []),
  ];


  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">Explore projects</h1>

      <div className="relative mt-5">
        <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4">
          <IconSearch className="text-ink-soft" />
          <label htmlFor="q" className="sr-only">Search projects</label>
          <input id="q" ref={qRef} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
            placeholder="Search by name, technique, fabric…" title="Press / to search" className="min-h-[52px] flex-1 bg-transparent outline-none" role="combobox" aria-expanded={focus && (suggestions.length > 0 || !q)} aria-controls="q-sugg" autoComplete="off" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" className="btn-icon"><IconX size={16} /></button>}
        </div>
        {focus && (suggestions.length > 0 || !q) && (
          <ul id="q-sugg" role="listbox" className="card absolute inset-x-0 top-full z-20 mt-2 overflow-hidden p-2 shadow-lg">
            {(q ? suggestions : POPULAR_SEARCHES).map((s) => (
              <li key={s} role="option" aria-selected={false}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(s); setFocus(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-beige">
                  <IconSearch size={14} className="text-ink-soft" />{s}{!q && <span className="ml-auto text-xs text-ink-soft">popular</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button className="chip chip-toggle" aria-pressed={!cat} onClick={() => setCat(null)}>All</button>
        {categories.map((c) => (
          <button key={c.id} className="chip chip-toggle shrink-0" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>{c.name}</button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden space-y-5 lg:block" aria-label="Filters">
          <div className="card p-4">
            <p className="mb-4 font-semibold">Filters {activeCount > 0 && <span className="chip ml-1 !bg-terra !text-white">{activeCount}</span>}</p>
            {filterBody}
          </div>
          <button onClick={() => setShowFinder((v) => !v)} aria-expanded={showFinder} className="card w-full p-4 text-left">
            <span className="font-semibold">What can I make with my fabric?</span>
            <span className="mt-1 block text-sm text-ink-soft">Enter a piece you own; we test each pattern&apos;s real cutting layout.</span>
          </button>
          {showFinder && <FabricFinder projects={fabricProjects} cards={cards} />}
        </aside>

        <section>
          <div className="mb-3 flex gap-2 lg:hidden">
            <button className="btn btn-secondary flex-1" onClick={() => setSheet(true)} aria-haspopup="dialog"><IconFilter size={18} />Filters{activeCount > 0 && <span className="chip !bg-terra !text-white !px-2">{activeCount}</span>}</button>
            <button className="btn btn-secondary flex-1" onClick={() => setShowFinder((v) => !v)} aria-expanded={showFinder}>My fabric…</button>
          </div>
          {showFinder && <div className="mb-4 lg:hidden"><FabricFinder projects={fabricProjects} cards={cards} /></div>}
          {chips.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => <button key={c.label} onClick={c.clear} className="chip !bg-ink !text-cream" aria-label={`Remove filter ${c.label}`}>{c.label}<IconX size={12} /></button>)}
              <button onClick={clear} className="text-sm font-semibold text-terra">Clear all</button>
            </div>
          )}
          <div className="mb-4 flex items-center justify-between gap-3" aria-live="polite">
            <p className="text-sm text-ink-soft">{results.length} project{results.length === 1 ? "" : "s"}{q && <> for “{q}”</>}</p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink-soft">Sort</span>
              <select className="input !min-h-[38px] !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="popular">Most popular</option>
                <option value="quick">Quickest</option>
                <option value="easy">Easiest</option>
              </select>
            </label>
          </div>
          {results.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((c) => <ProjectCard key={c.id} card={c} />)}</div>
          ) : (
            <div className="card p-10 text-center">
              <p className="font-display text-xl">No projects match yet</p>
              <p className="mt-2 text-sm text-ink-soft">Try fewer filters or another search. New patterns are added as they pass review.</p>
              <button onClick={clear} className="btn btn-secondary mt-4">Reset filters</button>
            </div>
          )}
        </section>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters" onClick={() => setSheet(false)}>
          <div className="sheet-up max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 pb-0" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" aria-hidden />
            <div className="mb-4 flex items-center justify-between"><p className="font-display text-xl font-semibold">Filters</p><button className="btn-icon" onClick={() => setSheet(false)} aria-label="Close filters" autoFocus><IconX size={16} /></button></div>
            {filterBody}
            <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line bg-paper p-4">
              <button className="btn btn-primary w-full" onClick={() => setSheet(false)}>Show {results.length} project{results.length === 1 ? "" : "s"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FabricFinder({ projects, cards }: { projects: FabricProject[]; cards: Card[] }) {
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
          <span className="mb-1 block font-semibold">From my stash</span>
          <select className="input" onChange={(e) => { const s = stash.find((x) => x.id === e.target.value); if (s) { setType(s.type); setWidth(s.widthCm); setLengthCm(s.lengthCm); } }}>
            <option value="">Choose a fabric…</option>
            {stash.map((s) => <option key={s.id} value={s.id}>{s.color} {s.type} — {fabricAmount(s.lengthCm, units)}</option>)}
          </select>
        </label>
      )}
      <label className="block"><span className="mb-1 block font-semibold">Fabric type</span>
        <input className="input" list="ftypes" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. canvas" />
        <datalist id="ftypes">{FABRIC_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label><span className="mb-1 block font-semibold">Width ({units === "imperial" ? "in" : "cm"})</span>
          <input className="input" type="number" min={20} value={Math.round(width / f)} onChange={(e) => setWidth(Number(e.target.value) * f)} /></label>
        <label><span className="mb-1 block font-semibold">Length ({units === "imperial" ? "in" : "cm"})</span>
          <input className="input" type="number" min={10} value={Math.round(lengthCm / f)} onChange={(e) => setLengthCm(Number(e.target.value) * f)} /></label>
      </div>
      <p className="text-xs text-ink-soft">Checks each fabric piece of a pattern against a {boltWidth(width, units)} × {fabricAmount(lengthCm, units)} piece, folded or single, including a safety margin.</p>
      <ul className="space-y-2">
        {res.length === 0 && <li className="text-ink-soft">Nothing fits that piece at the default size. Try a larger amount or smaller custom size.</li>}
        {res.map(({ p, usable }) => (
          <li key={p.id}>
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/projects/${p.id}/`} className="block rounded-xl bg-sage-soft p-3 hover:bg-[#d9e3d1]">
              <span className="font-semibold">{cards.find((c) => c.id === p.id)?.title ?? p.title}</span>
              <span className="block text-xs text-ink-soft">Covers: {usable.map((u) => `${u.material.name.split("—")[0].trim()} (${fabricAmount(u.need!.totalCm, units)})`).join(", ")}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
