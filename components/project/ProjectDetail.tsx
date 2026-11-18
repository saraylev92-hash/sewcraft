"use client";
import { printHref, projectHref, sewHref } from "@/lib/paths";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import MoreMenu from "../MoreMenu";
import type { Project, Stage } from "@/lib/types";
import type { ProjectCard as Card } from "@/lib/cards";
import { markViewed, toggleFavorite, useHydrated, useStore } from "@/lib/store";
import { useProject } from "@/lib/useProject";
import { fabricAmount } from "@/lib/units";
import SceneView from "../scene/SceneView";
import ProjectCard from "../ProjectCard";
import { DifficultyBadge, STAGES, formatMinutes } from "../bits";
import { IconAlert, IconClock, IconHeart, IconMachine, IconPrint, IconShare, IconDownload } from "../icons";
import FabricPicker from "./FabricPicker";
import Checklist, { readiness } from "./Checklist";
import CuttingPlan from "./CuttingPlan";
import Customizer from "./Customizer";
import StepVisual from "./StepVisual";

type Tab = "overview" | "materials" | "cutting" | "steps";

export default function ProjectDetail({ project: p, techniques, related }: {
  project: Project; techniques: { id: string; name: string; summary: string }[]; related: Card[];
}) {
  const ps = useProject(p);
  const hydrated = useHydrated();
  const fav = useStore((s) => s.favorites.includes(p.id));
  const progress = useStore((s) => s.progress[p.id]);
  const [tab, setTab] = useState<Tab>("overview");
  const [view, setView] = useState(p.cover ? -1 : 0);
  const [preflight, setPreflight] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const saveOffline = async () => {
    try {
      const c = await caches.open("sewcraft-pages-v1");
      await c.addAll([projectHref(p), sewHref(p), printHref(p)]);
      toast("Saved for offline use", { tone: "success" });
    } catch { toast("Offline saving needs the installed (production) app"); }
  };
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => { markViewed(p.id); }, [p.id]);
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "") as Tab;
      if (["overview", "materials", "cutting", "steps"].includes(h)) setTab(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const tabsRef = useRef<HTMLDivElement>(null);
  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    // bring the tab content into view when the tab bar is off-screen or stuck
    const top = tabsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 70 || top > window.innerHeight * 0.6) tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const share = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title: p.title, text: p.summary, url });
      else { await navigator.clipboard.writeText(url); toast("Link copied to clipboard", { tone: "success" }); }
    } catch { /* cancelled */ }
  };

  const ready = readiness(p, ps.prefs.checklist);
  const mainNeed = ps.needs.find((n) => n.material.kind === "fabric");
  const doneCount = progress?.done.length ?? 0;
  const startLabel = hydrated && progress ? (progress.completedAt ? "Review project" : `Continue — step ${progress.current + 1}`) : "Start project";
  const onStart = (e: React.MouseEvent) => {
    // Gentle, skippable reminder to review supplies before a first start (never blocks).
    if (!progress && !ready.ready) { e.preventDefault(); setPreflight(true); }
  };
  const started = hydrated && !!progress;
  const stageSteps = (s: Stage) => p.steps.filter((x) => x.stage === s);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <nav className="mb-4 text-sm text-ink-soft" aria-label="Breadcrumb">
        <Link href={p.source === "community" ? "/community" : "/explore"} className="hover:text-ink">{p.source === "community" ? "Community" : "Explore"}</Link> / <Link href={`/explore?cat=${p.category}`} className="capitalize hover:text-ink">{p.category}</Link>{p.source === "community" && <> / <Link href="/community" className="hover:text-ink">Community</Link></>}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* Gallery */}
        <div>
          <div className="card overflow-hidden">
            {p.cover && view === -1 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover} alt={`${p.title} — maker's photo`} className="aspect-[4/3] w-full object-cover" />
            ) : p.gallery[Math.max(0, view)] ? <SceneView scene={p.gallery[Math.max(0, view)].scene} tones={ps.tones} skins={ps.skins} vars={ps.vars} units={ps.units} title={`${p.title} — ${p.gallery[Math.max(0, view)].label} view (illustration)`} className="bg-[var(--canvas)]" /> : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {p.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <button onClick={() => setView(-1)} aria-pressed={view === -1} className={`w-20 overflow-hidden rounded-xl border-2 ${view === -1 ? "border-terra" : "border-transparent"}`} aria-label="Maker's photo"><img src={p.cover} alt="" className="aspect-[4/3] w-full object-cover" /></button>
            )}
            {p.gallery.map((g, i) => (
              <button key={g.label} onClick={() => setView(i)} aria-pressed={view === i} className={`w-20 overflow-hidden rounded-xl border-2 ${view === i ? "border-terra" : "border-transparent"}`} aria-label={`${g.label} view`}>
                <SceneView scene={g.scene} tones={ps.tones} skins={ps.skins} vars={ps.vars} units={ps.units} title="" />
              </button>
            ))}
            <p className="ml-auto max-w-[14rem] text-right text-[11px] leading-tight text-ink-soft">{p.cover ? "Photo by the maker; illustrations drawn from pattern data." : "Illustrations drawn from pattern data. Product photos not yet available."}</p>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="flex flex-wrap items-center gap-2"><DifficultyBadge d={p.difficulty} />{p.tags.filter((t) => t !== p.difficulty).slice(0, 3).map((t) => <span key={t} className="chip capitalize">{t}</span>)}</div>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl">{p.title}</h1>
          <p className="mt-3 text-lg text-ink-soft">{p.summary}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact icon={<IconClock size={18} />} k="Time" v={formatMinutes(p.minutes)} />
            <Fact k="Cost" v={`$${p.costUSD[0]}–${p.costUSD[1]}`} />
            <Fact icon={<IconMachine size={18} />} k="Machine" v={p.machineRequired ? "Required" : "Optional"} />
            <Fact k="Fabric" v={mainNeed ? fabricAmount(mainNeed.need.totalCm, ps.units) : "—"} />
          </dl>

          {p.source === "community" ? (
            <p className="mt-5 flex gap-2 rounded-xl border border-[#c9d4c1] bg-sage-soft p-3 text-sm">
              <IconAlert className="mt-0.5 shrink-0 text-[#4c6142]" />
              <span><strong>Community guide by {p.author ?? "a maker"}.</strong> Shared by a fellow sewist and checked by the automatic content rules, but not reviewed or test-sewn by SewCraft editors.{p.local && " Saved on this device."}</span>
            </p>
          ) : !p.review.technicallyValidated && (
            <p className="mt-5 flex gap-2 rounded-xl border border-[#e8d4a8] bg-[#fbf3df] p-3 text-sm">
              <IconAlert className="mt-0.5 shrink-0 text-[#8a6a1f]" />
              <span><strong>Sample pattern — not yet test-sewn.</strong> {p.review.note} Make a quick paper or scrap test before cutting precious fabric.</span>
            </p>
          )}

          <div ref={heroRef} className="mt-6 flex items-center gap-2">
            <Link href={sewHref(p)} onClick={onStart} className="btn btn-primary flex-1 !min-h-[52px] text-base sm:flex-none sm:px-8">{startLabel}</Link>
            <button onClick={() => toggleFavorite(p.id, p.title)} className={`btn btn-secondary !px-4 ${fav ? "text-terra" : ""}`} aria-pressed={fav} aria-label={fav ? "Remove from favourites" : "Save to favourites"}><IconHeart filled={fav} size={18} /><span className="hidden sm:inline">{fav ? "Saved" : "Save"}</span></button>
            <MoreMenu items={[
              { label: "Print pattern", icon: <IconPrint size={18} />, href: printHref(p) },
              { label: "Share", icon: <IconShare size={18} />, run: share },
              { label: "Save for offline", icon: <IconDownload size={18} />, run: saveOffline },
            ]} />
          </div>
          {started && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-beige"><div className="h-full bg-terra" style={{ width: `${(doneCount / p.steps.length) * 100}%` }} /></div>
              <p className="mt-1 text-xs text-ink-soft">{doneCount} of {p.steps.length} steps complete</p>
            </div>
          )}
          <button onClick={() => go("materials")} className="mt-4 flex w-full items-center justify-between rounded-xl bg-paper p-3 text-left text-sm ring-1 ring-line hover:bg-beige/50">
            <span>{hydrated && ready.ready ? "✓ Supplies reviewed" : `Supplies checklist · ${hydrated ? ready.reviewed : 0}/${ready.total} reviewed`}</span>
            <span className="font-semibold text-terra">Open →</span>
          </button>
        </div>
      </div>

      {/* Mobile sticky start bar (appears once the main button scrolls away) */}
      {!heroVisible && (
        <div className="toast-in fixed inset-x-0 bottom-[60px] z-20 border-t border-line bg-paper/95 p-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.title}</p>{started && <p className="text-xs text-ink-soft">{doneCount}/{p.steps.length} steps</p>}</div>
            <Link href={sewHref(p)} onClick={onStart} className="btn btn-primary">{startLabel}</Link>
          </div>
        </div>
      )}

      {preflight && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="pf-h" onClick={() => setPreflight(false)}>
          <div className="sheet-up w-full rounded-t-3xl bg-paper p-6 sm:max-w-md sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold uppercase tracking-wider text-terra">Before you start</p>
            <h2 id="pf-h" className="mt-1 font-display text-2xl font-semibold">Got everything you need?</h2>
            <p className="mt-2 text-ink-soft">You&apos;ve reviewed {ready.reviewed} of {ready.total} required supplies. A quick check now saves a trip to the shop mid-project.</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-beige"><div className="h-full bg-sage" style={{ width: `${(ready.reviewed / ready.total) * 100}%` }} /></div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button autoFocus className="btn btn-primary flex-1" onClick={() => { setPreflight(false); go("materials"); }}>Review supplies</button>
              <button className="btn btn-secondary flex-1" onClick={() => router.push(sewHref(p))}>Start anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* Stages */}
      <section className="mt-10" aria-labelledby="stages-h">
        <h2 id="stages-h" className="sr-only">Project stages</h2>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STAGES.map((st, i) => {
            const steps = stageSteps(st.id as Stage);
            const done = steps.filter((s) => progress?.done.includes(s.id)).length;
            return (
              <li key={st.id}>
                <button onClick={() => go(st.id === "cut" ? "cutting" : st.id === "prep" ? "materials" : "steps")} className="card flex h-full w-full flex-col items-start gap-1 p-3 text-left hover:bg-beige/40">
                  <span className="text-xs font-semibold text-ink-soft">{i + 1}</span>
                  <span className="font-semibold leading-tight">{st.label}</span>
                  <span className="text-xs text-ink-soft">{steps.length ? `${steps.length} step${steps.length > 1 ? "s" : ""}${hydrated && done ? ` · ${done} done` : ""}` : "—"}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Tabs */}
      <div ref={tabsRef} className="sticky top-16 z-20 -mx-4 mt-8 scroll-mt-16 border-b border-line bg-cream/95 px-4 backdrop-blur md:mx-0 md:px-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
          {([["overview", "Overview"], ["materials", "Tools & materials"], ["cutting", "Measurements & cutting"], ["steps", "Steps"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => go(t)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === t ? "border-terra text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-6">
              <section>
                <h2 className="font-display text-2xl font-semibold">About this project</h2>
                <p className="mt-2 leading-relaxed text-ink-soft">{p.description}</p>
              </section>
              <section>
                <h3 className="font-semibold">Techniques you&apos;ll use</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {techniques.map((t) => <li key={t.id}><Link href={`/techniques/${t.id}`} className="chip hover:bg-sage-soft" title={t.summary}>{t.name}</Link></li>)}
                </ul>
              </section>
              <section className="rounded-2xl bg-paper p-4 ring-1 ring-line">
                <h3 className="font-semibold">Safety</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  <li>Keep fingers clear of the needle; switch off before changing needles or feet.</li>
                  <li>Irons are hot — stand upright when not in use and keep cords tidy.</li>
                  <li>Close rotary cutters and keep scissors pointed down when walking.</li>
                </ul>
              </section>
            </div>
            <Customizer p={p} ps={ps} />
          </div>
        )}
        {tab === "materials" && <div className="space-y-6"><FabricPicker p={p} ps={ps} /><Checklist p={p} ps={ps} /></div>}
        {tab === "cutting" && <CuttingPlan p={p} ps={ps} />}
        {tab === "steps" && (
          <div className="space-y-8">
            {STAGES.map((st) => {
              const steps = stageSteps(st.id as Stage);
              if (!steps.length) return null;
              return (
                <section key={st.id}>
                  <h3 className="mb-3 font-display text-xl font-semibold">{st.label}</h3>
                  <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {steps.map((s) => {
                      const idx = p.steps.indexOf(s);
                      const done = progress?.done.includes(s.id);
                      return (
                        <li key={s.id} className="card overflow-hidden">
                          <div className="pointer-events-none bg-[var(--canvas)]"><StepVisual step={s} tones={ps.tones} skins={ps.skins} vars={ps.vars} units={ps.units} needs={ps.needs} compact /></div>
                          <div className="p-3">
                            <p className="text-xs font-semibold text-ink-soft">Step {idx + 1}{done && <span className="ml-2 text-sage">✓ done</span>}</p>
                            <p className="font-semibold">{s.title}</p>
                            <Link href={sewHref(p, idx + 1)} className="mt-1 inline-block text-sm font-semibold text-terra">Open step →</Link>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-2xl font-semibold">You might also like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((c) => <ProjectCard key={c.id} card={c} />)}</div>
        </section>
      )}
    </div>
  );
}

function Fact({ k, v, icon }: { k: string; v: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-paper p-3 ring-1 ring-line">
      <dt className="flex items-center gap-1 text-xs text-ink-soft">{icon}{k}</dt>
      <dd className="mt-0.5 font-semibold">{v}</dd>
    </div>
  );
}
