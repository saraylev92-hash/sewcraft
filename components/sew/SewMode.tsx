"use client";
import { projectHref, sewHref } from "@/lib/paths";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GlossaryTerm, Level, Project } from "@/lib/types";
import { evaluate } from "@/lib/formula";
import { formatMeasure, lenNum, unitSuffix } from "@/lib/units";
import { compressImage, update, useHydrated, useStore, withProgress } from "@/lib/store";
import { useProject } from "@/lib/useProject";
import StepVisual, { stageMsg } from "../project/StepVisual";
import { tr, useLang, useT } from "@/lib/i18n";
import UnitToggle from "../UnitToggle";
import GlossaryText, { findTerms } from "./GlossaryText";
import Timer from "./Timer";
import FinishPanel from "./FinishPanel";
import FabricPicker from "../project/FabricPicker";
import { STAGES } from "../bits";
import { toast } from "@/lib/toast";
import { IconAlert, IconBookmark, IconBulb, IconCamera, IconCheck, IconChevronL, IconChevronR, IconList, IconRuler, IconSun, IconX, IconZoom } from "../icons";

const STAGE_ORDER: Record<string, number> = { prep: 0, cut: 1, sew: 2, assemble: 2, finish: 3 };

/** Keeps the screen on while sewing (hands are busy). Re-acquires after the tab becomes visible again. */
function useWakeLock(enabled: boolean): "on" | "off" | "unsupported" {
  const [state, setState] = useState<"on" | "off" | "unsupported">("off");
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) { setState("unsupported"); return; }
    if (!enabled) { setState("off"); return; }
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
        if (!cancelled) setState("on");
      } catch { setState("off"); }
    };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); lock?.release().catch(() => {}); };
  }, [enabled]);
  return state;
}

export default function SewMode({ project: p, techniques, glossary }: { project: Project; techniques: { id: string; name: string; summary: string }[]; glossary: GlossaryTerm[] }) {
  const t = useT();
  const lang = useLang();
  const rtl = lang === "he";
  const ps = useProject(p);
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const prog = useStore((s) => s.progress[p.id]);
  const current = prog?.current ?? 0;
  const level = useStore((s) => s.profile.level);
  const [showList, setShowList] = useState(false);
  const [showFabric, setShowFabric] = useState(false);
  const hasFabrics = p.materials.some((m) => m.kind === "fabric" || m.kind === "interfacing");
  const fabricChosen = useStore((s) => s.prefs[p.id]?.fabrics) !== undefined;
  const [zoomed, setZoomed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [dir, setDir] = useState(1);
  const keepAwake = useStore((s) => s.profile.keepAwake ?? true);
  const textScale = useStore((s) => s.profile.textScale);
  const awake = useWakeLock(hydrated && keepAwake);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // Create progress on first open ("Start project"), honour ?step=N deep links.
  useEffect(() => {
    if (!hydrated) return;
    const q = Number(sp.get("step"));
    withProgress(p.id, (pr) => {
      if (q >= 1 && q <= p.steps.length) pr.current = q - 1;
    });
    if (q) router.replace(sewHref(p), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const idx = Math.min(prog?.current ?? 0, p.steps.length - 1);
  const step = p.steps[idx];
  const done = new Set(prog?.done ?? []);
  const isDone = done.has(step.id);
  const pct = Math.round((done.size / p.steps.length) * 100);
  const allDone = done.size === p.steps.length;
  const bookmarked = prog?.bookmarks.includes(step.id);

  const goTo = useCallback((i: number) => {
    const n = Math.max(0, Math.min(p.steps.length - 1, i));
    setDir(n >= current ? 1 : -1);
    withProgress(p.id, (pr) => { pr.current = n; });
    setShowDetail(false);
    setShowList(false);
    topRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [p.id, p.steps.length, current]);

  const toggleDone = useCallback(() => {
    let advanced = false;
    let stageFinished = false;
    withProgress(p.id, (pr) => {
      if (pr.done.includes(step.id)) pr.done = pr.done.filter((x) => x !== step.id);
      else {
        pr.done = [...pr.done, step.id];
        stageFinished = p.steps.filter((s) => s.stage === step.stage).every((s) => pr.done.includes(s.id));
        if (pr.current < p.steps.length - 1) { pr.current += 1; advanced = true; }
      }
    });
    if (advanced) { setDir(1); topRef.current?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); }
    if (stageFinished) {
      const next = p.steps.find((s) => s.stage !== step.stage && STAGE_ORDER[s.stage] > STAGE_ORDER[step.stage]);
      toast(`${tr("sew.stageComplete", { stage: tr(stageMsg(step.stage)) })}${next ? ` ${tr("sew.stageNext", { stage: tr(stageMsg(next.stage)) })}` : ""}`, { tone: "celebrate", ms: 3500 });
    }
  }, [p.id, p.steps, step.id, step.stage]);

  // Move focus to the new step title so screen readers announce it (not on first render).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    titleRef.current?.focus({ preventScroll: true });
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Inside the fabric panel only Escape is ours (closes it); arrows/C belong to the picker controls.
      if (t.closest?.("#sew-fabric")) { if (e.key === "Escape") setShowFabric(false); return; }
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT") return;
      if (t.closest?.("[role=dialog]")) return;
      if (e.key === "ArrowRight") goTo(idx + (rtl ? -1 : 1));
      else if (e.key === "ArrowLeft") goTo(idx + (rtl ? 1 : -1));
      else if (e.key.toLowerCase() === "c") toggleDone();
      else if (e.key === "Escape") { setZoomed(false); setShowList(false); setShowFabric(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, goTo, toggleDone, rtl]);

  if (!hydrated) return <div className="grid min-h-screen place-items-center text-ink-soft">{t("sew.loading")}</div>;
  if (finishing || (prog?.completedAt && !reviewing)) return <FinishPanel p={p} onBack={() => { setFinishing(false); setReviewing(true); }} />;

  const terms = level === "expert" ? [] : findTerms(`${step.text} ${step.beginner ?? ""}`, glossary);
  const stepTechniques = techniques.filter((t) => step.techniques?.includes(t.id));
  const stepPieces = ps.pieces.filter((x) => step.pieces?.includes(x.id));

  const setLevel = (l: Level) => update((s) => void (s.profile.level = l));
  const stageBars = STAGES.map((st) => {
    const steps = p.steps.filter((s) => s.stage === st.id);
    return { st, total: steps.length, done: steps.filter((s) => done.has(s.id)).length, current: step.stage === st.id };
  }).filter((b) => b.total > 0);
  const nextStep = p.steps[idx + 1];
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.target as HTMLElement;
    touch.current = t.closest("textarea,input,select,[data-noswipe]") ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) goTo(idx + ((dx < 0) !== rtl ? 1 : -1));
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2 md:px-5">
          <Link href={projectHref(p)} className="btn-icon shrink-0" aria-label={t("sew.leave")}><IconX size={18} /></Link>
          <button className="btn-icon shrink-0 lg:hidden" onClick={() => setShowList((v) => !v)} aria-label={t("sew.allSteps")} aria-expanded={showList}><IconList size={18} /></button>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-xs text-ink-soft">{p.title} · {t(stageMsg(step.stage))}</p>
            <p className="truncate text-sm font-semibold">{t("sew.stepOfTotal", { n: idx + 1, total: p.steps.length })}</p>
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-line bg-paper p-0.5 text-xs font-semibold sm:inline-flex" role="group" aria-label={t("sew.instructionDetail")}>
            {(["beginner", "standard", "expert"] as Level[]).map((l) => (
              <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)} className={`min-h-[32px] rounded-full px-3 capitalize ${level === l ? "bg-ink text-cream" : "text-ink-soft"}`}>{t(`sew.level.${l}`)}</button>
            ))}
          </div>
          {hasFabrics && (
            <button className={`btn-icon shrink-0 !w-auto gap-1.5 px-2.5 text-xs font-bold ${showFabric || fabricChosen ? "!bg-terra-soft" : ""}`} aria-expanded={showFabric} aria-controls="sew-fabric"
              title={t("sew.fabric.title")} onClick={() => setShowFabric((v) => !v)}>
              <span aria-hidden className="h-4 w-4 rounded-full border border-black/20" style={{ background: "repeating-linear-gradient(45deg,#C66B4E 0 3px,#f3e6da 3px 6px)" }} />
              {t("sew.fabric.button")}
            </button>
          )}
          <button className="btn-icon shrink-0 !w-auto px-2.5 text-xs font-bold" aria-label={t("sew.textSizePct", { pct: Math.round(textScale * 100) })} title={t("sew.textSize")}
            onClick={() => update((s) => void (s.profile.textScale = s.profile.textScale >= 1.3 ? 1 : +(s.profile.textScale + 0.15).toFixed(2)))}>Aa</button>
          {awake !== "unsupported" && (
            <button className={`btn-icon shrink-0 ${keepAwake ? "!bg-[#fbf0d9] text-[#8a6a1f]" : ""}`} aria-pressed={keepAwake} title={keepAwake ? t("sew.awakeOn") : t("sew.awakeOff")}
              aria-label={t("sew.keepAwake")} onClick={() => { update((s) => void (s.profile.keepAwake = !keepAwake)); toast(keepAwake ? t("sew.toastSleep") : t("sew.toastAwake")); }}><IconSun size={18} /></button>
          )}
          <span className="hidden sm:block"><UnitToggle /></span>
        </div>
        {showFabric && (
          <div id="sew-fabric" role="region" aria-label={t("sew.fabric.title")} data-noswipe className="max-h-[60dvh] overflow-y-auto border-t border-line bg-paper px-3 py-3 md:px-5">
            <div className="mb-3 flex items-center gap-2">
              <p className="flex-1 text-sm font-semibold">{t("sew.fabric.title")} <span className="font-normal text-ink-soft">· {t("sew.fabric.sub")}</span></p>
              <button className="btn-icon shrink-0" aria-label={t("sew.fabric.close")} onClick={() => setShowFabric(false)}><IconX size={16} /></button>
            </div>
            <FabricPicker p={p} ps={ps} compact />
          </div>
        )}
        <div className="flex gap-1 px-3 pb-2 md:px-5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("sew.progressAria", { pct })}>
          {stageBars.map((b) => (
            <div key={b.st.id} className="min-w-0" style={{ flex: b.total }} title={`${t(stageMsg(b.st.id))}: ${b.done}/${b.total}`}>
              <div className={`h-1.5 overflow-hidden rounded-full ${b.current ? "bg-terra-soft" : "bg-beige"}`}>
                <div className={`h-full rounded-full transition-all duration-500 ${b.done === b.total ? "bg-sage" : "bg-terra"}`} style={{ width: `${(b.done / b.total) * 100}%` }} />
              </div>
              <p className={`mt-1 hidden truncate text-[10px] font-semibold uppercase tracking-wide md:block ${b.current ? "text-terra" : "text-ink-soft"}`}>{t(stageMsg(b.st.id))}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Step list */}
        <aside className={`${showList ? "fixed inset-0 top-[58px] z-20 block bg-paper" : "hidden"} w-full overflow-y-auto border-e border-line bg-paper lg:sticky lg:top-[58px] lg:block lg:h-[calc(100dvh-58px)] lg:w-72`} aria-label={t("sew.stepsAria")}>
          <div className="flex gap-1 p-3 sm:hidden" role="group" aria-label={t("sew.instructionDetail")}>
            {(["beginner", "standard", "expert"] as Level[]).map((l) => (
              <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)} className="chip chip-toggle flex-1 justify-center capitalize">{t(`sew.level.${l}`)}</button>
            ))}
          </div>
          <ol className="p-2">
            {p.steps.map((s, i) => {
              const d = done.has(s.id);
              const first = i === 0 || p.steps[i - 1].stage !== s.stage;
              return (
                <li key={s.id}>
                  {first && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t(stageMsg(s.stage))}</p>}
                  <button onClick={() => goTo(i)} aria-current={i === idx ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm ${i === idx ? "bg-terra-soft font-semibold" : "hover:bg-beige/60"}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${d ? "bg-sage text-white" : i === idx ? "bg-terra text-white" : "bg-beige text-ink-soft"}`}>{d ? <IconCheck size={14} /> : i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    {prog?.bookmarks.includes(s.id) && <IconBookmark size={14} filled className="text-mustard" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Workspace */}
        <main ref={topRef} className="min-w-0 flex-1 pb-28" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <p className="sr-only" aria-live="polite">{t("sew.liveStep", { n: idx + 1, total: p.steps.length, title: step.title })}{isDone ? t("sew.liveCompleted") : ""}</p>
          <div key={step.id} className="step-in mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" style={{ ["--step-dir" as string]: dir > 0 ? "18px" : "-18px" }}>
            {/* Visual */}
            <section aria-label={t("sew.illustration")} className="xl:sticky xl:top-[76px] xl:self-start">
              <div className="card relative overflow-hidden">
                <StepVisual step={step} tones={ps.tones} vars={ps.vars} units={ps.units} needs={ps.needs} skins={ps.skins} contrast={ps.contrast} compact legend />
                <button onClick={() => setZoomed(true)} className="btn-icon absolute end-3 top-3 !h-11 !w-11 shadow" aria-label={t("sew.zoomIllustration")}><IconZoom size={20} /></button>
              </div>
              {step.visual.type === "scene" && <p className="mt-2 px-1 text-xs text-ink-soft">{step.alt}</p>}
            </section>

            {/* Instructions */}
            <section aria-labelledby="step-title" className="space-y-5">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-terra">{t("sew.stepOfTotal", { n: idx + 1, total: p.steps.length })}{isDone && <span className="chip !bg-sage !text-white !text-[11px]"><IconCheck size={12} />{t("sew.done")}</span>}</p>
                <h1 id="step-title" ref={titleRef} tabIndex={-1} className="outline-none font-display text-2xl font-semibold leading-tight md:text-3xl">{step.title}</h1>
              </div>

              <div className="space-y-3 text-[1.05rem] leading-relaxed">
                {level === "expert" ? (
                  <>
                    <p className="font-medium">{step.expert}</p>
                    <button onClick={() => setShowDetail((v) => !v)} className="text-sm font-semibold text-terra" aria-expanded={showDetail}>{showDetail ? t("sew.hideDetails") : t("sew.showFull")}</button>
                    {showDetail && <p className="text-ink-soft">{step.text}</p>}
                  </>
                ) : (
                  <>
                    <p><GlossaryText text={step.text} terms={glossary} enabled /></p>
                    {level === "beginner" && step.beginner && (
                      <div className="rounded-2xl bg-sage-soft p-4 text-[0.98rem]">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#4c6142]">{t("sew.moreDetail")}</p>
                        <p><GlossaryText text={step.beginner} terms={glossary} enabled /></p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Measurements — identical in every mode */}
              {(step.measurements?.length || stepPieces.length) ? (
                <div className="card p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><IconRuler size={18} className="text-terra" />{t("sew.measurements")}</p>
                  <dl className="divide-y divide-line text-sm">
                    {step.measurements?.map((m) => (
                      <div key={m.label} className="flex justify-between gap-4 py-1.5"><dt className="text-ink-soft">{m.label}</dt><dd className="font-semibold tabular-nums">{formatMeasure(evaluate(m.value, ps.vars), m.unit, ps.units)}</dd></div>
                    ))}
                    {stepPieces.map((pc) => (
                      <div key={pc.id} className="flex justify-between gap-4 py-1.5"><dt className="text-ink-soft"><span className="me-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: pc.color }} />{pc.name} ×{pc.quantity}</dt><dd className="font-semibold tabular-nums">{lenNum(pc.width, ps.units)} × {lenNum(pc.height, ps.units)} {unitSuffix(ps.units)}</dd></div>
                    ))}
                  </dl>
                  {ps.custom && <p className="mt-2 text-xs text-terra">{t("sew.customSize")}</p>}
                </div>
              ) : null}

              {/* Safety — identical in every mode */}
              {step.warnings?.map((w) => (
                <p key={w} className="flex gap-2 rounded-xl border border-[#e8d4a8] bg-[#fbf3df] p-3 text-sm" role="note"><IconAlert className="mt-0.5 shrink-0 text-[#8a6a1f]" /><span><strong>{t("sew.safety")} </strong>{w}</span></p>
              ))}

              {step.tips && step.tips.length > 0 && (
                <details className="card p-4" open={level !== "expert"}>
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><IconBulb size={18} className="text-mustard" />{t("sew.tips")}</summary>
                  <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ink-soft">{step.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                </details>
              )}

              {step.stage === "cut" && (
                <Link href={`${projectHref(p)}#cutting`} className="block rounded-xl bg-paper p-3 text-sm ring-1 ring-line">{t("sew.openCutting")}</Link>
              )}

              {(stepTechniques.length > 0 || terms.length > 0) && (
                <details className="card p-4">
                  <summary className="cursor-pointer text-sm font-semibold">{t("sew.stuck")}</summary>
                  <ul className="mt-3 space-y-2 text-sm">
                    {terms.map((tm) => <li key={tm.term}><strong className="capitalize">{tm.term}</strong> — {tm.definition}</li>)}
                    {stepTechniques.map((tq) => <li key={tq.id}><Link href={`/techniques/${tq.id}`} className="font-semibold text-terra">{tq.name}</Link> — {tq.summary}</li>)}
                  </ul>
                  <p className="mt-3 text-xs text-ink-soft">{t("sew.verified")}</p>
                </details>
              )}

              <StepTools p={p} stepId={step.id} timerMin={step.timerMin} />

              <div className="flex items-center gap-2">
                <button onClick={() => withProgress(p.id, (pr) => { pr.bookmarks = pr.bookmarks.includes(step.id) ? pr.bookmarks.filter((x) => x !== step.id) : [...pr.bookmarks, step.id]; })}
                  className={`btn btn-secondary !min-h-[40px] text-sm ${bookmarked ? "text-[#8a6a1f]" : ""}`} aria-pressed={!!bookmarked}>
                  <IconBookmark size={16} filled={bookmarked} />{bookmarked ? t("sew.bookmarked") : t("sew.bookmark")}
                </button>
              </div>

              {nextStep && (
                <button onClick={() => goTo(idx + 1)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-start hover:bg-paper">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t("sew.upNext")}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{t("sew.nextStepTitle", { n: idx + 2, title: nextStep.title })}</span>
                  <IconChevronR size={18} className="text-ink-soft rtl:-scale-x-100" />
                </button>
              )}
              <p className="text-center text-xs text-ink-soft md:hidden">{t("sew.swipeTip")}</p>
            </section>
          </div>
        </main>
      </div>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur lg:start-72" aria-label={t("sew.stepNav")}>
        <div className="mx-auto flex max-w-4xl items-center gap-2 p-3">
          <button onClick={() => goTo(idx - 1)} disabled={idx === 0} className="btn btn-secondary !min-h-[56px] shrink-0 !px-4 sm:!px-6" aria-label={t("sew.prevAria")}><IconChevronL className="rtl:-scale-x-100" /><span className="hidden sm:inline">{t("sew.prev")}</span></button>
          {allDone && idx === p.steps.length - 1 ? (
            <button onClick={() => { withProgress(p.id, (pr) => { pr.completedAt = Date.now(); }); setFinishing(true); }} className="btn btn-sage !min-h-[56px] min-w-0 flex-1 text-base">{t("sew.finishProject")}</button>
          ) : (
            <button onClick={toggleDone} className={`btn !min-h-[56px] min-w-0 flex-1 text-base ${isDone ? "btn-sage" : "btn-primary"}`} aria-pressed={isDone}>
              <IconCheck />{isDone ? t("sew.completed") : idx === p.steps.length - 1 ? t("sew.markComplete") : <><span className="sm:hidden">{t("sew.doneNext")}</span><span className="hidden sm:inline">{t("sew.markCompleteNext")}</span></>}
            </button>
          )}
          <button onClick={() => goTo(idx + 1)} disabled={idx === p.steps.length - 1} className="btn btn-secondary !min-h-[56px] shrink-0 !px-4 sm:!px-6" aria-label={t("sew.nextAria")}><span className="hidden sm:inline">{t("sew.next")}</span><IconChevronR className="rtl:-scale-x-100" /></button>
        </div>
        <p className="hidden pb-2 text-center text-[11px] text-ink-soft md:block">{t("sew.keys")}</p>
      </nav>

      {zoomed && <ZoomOverlay onClose={() => setZoomed(false)}><StepVisual step={step} tones={ps.tones} vars={ps.vars} units={ps.units} needs={ps.needs} skins={ps.skins} contrast={ps.contrast} compact /></ZoomOverlay>}
    </div>
  );
}

function ZoomOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const t = useT();
  const [z, setZ] = useState(1.5);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/90" role="dialog" aria-modal="true" aria-label={t("sew.zoomed")}>
      <div className="flex items-center justify-end gap-2 p-3">
        <button className="btn-icon" onClick={() => setZ((v) => Math.max(1, v - 0.5))} aria-label={t("project.zoomOut")}>−</button>
        <span className="w-14 text-center text-sm text-white">{Math.round(z * 100)}%</span>
        <button className="btn-icon" onClick={() => setZ((v) => Math.min(4, v + 0.5))} aria-label={t("project.zoomIn")}>+</button>
        <button className="btn-icon" onClick={onClose} aria-label={t("sew.close")} autoFocus><IconX size={18} /></button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div style={{ width: `${z * 100}%` }} className="mx-auto rounded-xl bg-paper">{children}</div>
      </div>
    </div>
  );
}

function StepTools({ p, stepId, timerMin }: { p: Project; stepId: string; timerMin?: number }) {
  const t = useT();
  const note = useStore((s) => s.progress[p.id]?.notes[stepId]) ?? "";
  const photos = useStore((s) => s.progress[p.id]?.photos[stepId]);
  const [err, setErr] = useState("");
  useEffect(() => {
    const h = () => setErr(tr("sew.storageFull"));
    window.addEventListener("sewcraft:save-error", h);
    return () => window.removeEventListener("sewcraft:save-error", h);
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Timer defaultMin={timerMin} />
      <div className="card p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><IconCamera size={18} />{t("sew.progressPhotos")}</p>
        <div className="flex flex-wrap gap-2">
          {(photos ?? []).map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={t("sew.photoAlt", { n: i + 1 })} className="h-16 w-16 rounded-lg object-cover" />
              <button onClick={() => withProgress(p.id, (pr) => { pr.photos[stepId] = (pr.photos[stepId] ?? []).filter((_, j) => j !== i); })} className="absolute -end-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-white" aria-label={t("sew.removePhoto")}><IconX size={12} /></button>
            </div>
          ))}
          <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line text-2xl text-ink-soft hover:bg-beige/50">
            +<input type="file" accept="image/*" capture="environment" className="sr-only" aria-label={t("sew.addPhoto")}
              onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setErr(""); const d = await compressImage(f); withProgress(p.id, (pr) => { pr.photos[stepId] = [...(pr.photos[stepId] ?? []), d]; }); e.target.value = ""; }} />
          </label>
        </div>
        {err && <p className="mt-2 text-xs text-terra">{err}</p>}
      </div>
      <label className="card block p-4 sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold">{t("sew.myNotes")}</span>
        <textarea value={note} onChange={(e) => withProgress(p.id, (pr) => { pr.notes[stepId] = e.target.value; })} rows={2} className="input !min-h-[64px] py-2" placeholder={t("sew.notesPlaceholder")} />
      </label>
    </div>
  );
}
