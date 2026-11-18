"use client";
// Plays an animated storyboard (Frame[]) as a cross-fading sequence, with play/pause, step and replay.
// Reduced-motion users get no autoplay and no fades: they step through the frames by hand.
// Also hosts the optional real video of a step (mp4/webm or YouTube).
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Frame, Units } from "@/lib/types";
import type { Skin } from "@/lib/fabrics";
import { useT } from "@/lib/i18n";
import SceneView from "./SceneView";

const RM = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(RM); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(RM).matches,
    () => false,
  );
}

interface Common { tones: Record<string, string>; vars: Record<string, number>; units: Units; contrast?: boolean; skins?: Record<string, Skin>; title: string }

export function SceneAnimation({ frames, ...c }: Common & { frames: Frame[] }) {
  const t = useT();
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const auto = playing && !reduced;
  const last = frames.length - 1;

  useEffect(() => {
    if (!auto) return;
    // Hold the final frame a little longer before looping.
    const ms = (frames[i]?.ms ?? 1600) + (i === last ? 1200 : 0);
    const id = window.setTimeout(() => setI((x) => (x >= last ? 0 : x + 1)), ms);
    return () => window.clearTimeout(id);
  }, [auto, i, last, frames]);

  const go = (n: number) => { setPlaying(false); setI(Math.max(0, Math.min(last, n))); };

  return (
    <div>
      <div className="relative" aria-hidden>
        {frames.map((f, k) => (
          <div key={k} className={`${k === 0 ? "relative" : "absolute inset-0"} ${reduced ? "" : "transition-opacity duration-500"} ${k === i ? "opacity-100" : "opacity-0"}`}>
            <SceneView scene={{ els: f.els }} {...c} title="" />
          </div>
        ))}
      </div>
      {/* Screen readers get the static final illustration's description plus the current caption. */}
      <p className="sr-only">{c.title}</p>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 text-sm">
        <button type="button" className="btn-icon shrink-0" onClick={() => (reduced ? go(i >= last ? 0 : i + 1) : setPlaying((p) => !p))}
          aria-label={reduced ? t("project.demo.next") : auto ? t("project.demo.pause") : t("project.demo.play")}>
          <span aria-hidden className="text-xs font-bold">{reduced ? "›" : auto ? "❚❚" : "▶"}</span>
        </button>
        <p className="min-w-0 flex-1 font-semibold" aria-live={auto ? "off" : "polite"}>
          <span className="me-1.5 text-ink-soft">{t("project.demo.frame", { n: i + 1, total: frames.length })}</span>
          {frames[i]?.caption}
        </p>
        <div className="flex items-center gap-1" role="group" aria-label={t("project.demo.steps")}>
          {frames.map((f, k) => (
            <button key={k} type="button" onClick={() => go(k)} aria-label={t("project.demo.goto", { n: k + 1, caption: f.caption })} aria-current={k === i ? "step" : undefined}
              className={`h-2.5 rounded-full transition-all ${k === i ? "w-6 bg-terra" : "w-2.5 bg-line hover:bg-ink-soft"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

const yt = (src: string) => src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)?.[1];

export function StepVideo({ src, title }: { src: string; title: string }) {
  const id = yt(src);
  if (id) {
    return (
      <div className="aspect-video w-full">
        <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title={title} loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return <video className="aspect-video w-full bg-black" src={src} controls playsInline preload="metadata" title={title} />;
}
