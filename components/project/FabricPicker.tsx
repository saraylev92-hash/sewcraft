"use client";
// "Preview with your fabric": optional per-material fabric look. Default (flat colour) is always one tap away.
import { useId, useState } from "react";
import type { Project } from "@/lib/types";
import type { useProject } from "@/lib/useProject";
import { compressImage, useStore, withPrefs, type StashFabric } from "@/lib/store";
import { PRESETS, averageColor, presetHref, type FabricChoice } from "@/lib/fabrics";
import { toast } from "@/lib/toast";
import SceneView from "../scene/SceneView";

const ring = (on: boolean) =>
  `relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 text-[10px] font-semibold leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${on ? "border-terra ring-2 ring-terra/40" : "border-line"}`;

export default function FabricPicker({ p, ps }: { p: Project; ps: ReturnType<typeof useProject> }) {
  const stash = useStore((s) => s.stash);
  const mats = p.materials.filter((m) => m.kind === "fabric" || m.kind === "interfacing");
  const fabrics = ps.prefs.fabrics;
  const scene = p.gallery[0]?.scene;
  if (mats.length === 0) return null;

  const set = (id: string, ch: FabricChoice | null) =>
    withPrefs(p.id, (x) => {
      const f = { ...(x.fabrics ?? {}) };
      if (ch) f[id] = ch; else delete f[id];
      x.fabrics = Object.keys(f).length ? f : undefined;
    });

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="fab-h">
      <h3 id="fab-h" className="font-display text-xl font-semibold">Preview with your fabric</h3>
      <p className="mt-1 text-sm text-ink-soft">See the guide in your own fabric. Photos stay on this device.</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_240px]">
        <div className="space-y-5">
          {mats.map((m) => (
            <Row key={m.id} name={m.name} swatch={m.swatch} choice={fabrics?.[m.id]}
              stash={stash} onChange={(ch) => set(m.id, ch)} />
          ))}
        </div>
        {scene && (
          <figure className="self-start overflow-hidden rounded-xl border border-line" aria-label="Live preview">
            <SceneView scene={scene} tones={ps.tones} skins={ps.skins} vars={ps.vars} units={ps.units} title={`${p.title} preview in your fabric`} />
            <figcaption className="px-3 py-1.5 text-xs text-ink-soft">Live preview</figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

function Row({ name, swatch, choice: raw, stash, onChange }: {
  name: string; swatch: string; choice?: FabricChoice; stash: StashFabric[];
  onChange: (c: FabricChoice | null) => void;
}) {
  const uid = useId();
  const [busy, setBusy] = useState(false);
  const photoStash = stash.filter((s) => s.photo);
  // A stash choice whose fabric (or photo) was deleted renders as default, so show Default as selected.
  const choice = raw?.kind === "stash" && !stash.some((f) => f.id === raw.stashId && f.photo) ? undefined : raw;
  const sized = choice && choice.kind !== "preset" ? choice : null;

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const src = await compressImage(file, 600);
      const avg = await averageColor(src);
      onChange({ kind: "photo", src, avg, tileCm: 12 });
    } catch {
      toast("Couldn’t read that photo");
    } finally { setBusy(false); }
  };

  return (
    <div role="group" aria-label={`Fabric look for ${name}`}>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="h-3.5 w-3.5 rounded-sm border border-black/20" style={{ background: swatch }} aria-hidden />{name}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!choice} aria-label="Default colour" title="Default colour" onClick={() => onChange(null)} className={ring(!choice)} style={{ background: swatch }}>
          <span className="rounded bg-white/80 px-1 text-center text-ink">Default</span>
        </button>
        {PRESETS.map((pr) => {
          const on = choice?.kind === "preset" && choice.presetId === pr.id;
          const href = presetHref(pr.id, swatch);
          return (
            <button key={pr.id} type="button" aria-pressed={on} aria-label={pr.name} title={pr.name}
              onClick={() => onChange({ kind: "preset", presetId: pr.id, color: swatch })} className={ring(on)}
              style={{ backgroundImage: `url("${href}")`, backgroundSize: "28px 28px" }} />
          );
        })}
        {photoStash.map((s) => {
          const on = choice?.kind === "stash" && choice.stashId === s.id;
          return (
            <button key={s.id} type="button" aria-pressed={on} aria-label={`Stash fabric: ${s.type}`} title={`From your stash: ${s.type}`}
              onClick={() => onChange({ kind: "stash", stashId: s.id, tileCm: 12 })} className={ring(on)}
              style={{ backgroundImage: `url("${s.photo}")`, backgroundSize: "cover" }} />
          );
        })}
        {choice?.kind === "photo" && (
          <button type="button" aria-pressed aria-label="Your uploaded photo" title="Your photo" className={ring(true)}
            style={{ backgroundImage: `url("${choice.src}")`, backgroundSize: "cover" }} />
        )}
        <label className={`${ring(false)} cursor-pointer border-dashed focus-within:outline focus-within:outline-2 focus-within:outline-offset-2`} title="Upload or take a photo">
          <span className="px-1 text-center text-ink-soft">{busy ? "…" : "Upload or take a photo"}</span>
          <input type="file" accept="image/*" className="sr-only" aria-label={`Upload or take a photo of your fabric for ${name}`}
            onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {sized && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <label htmlFor={`${uid}-size`} className="text-ink-soft">Print size</label>
          <input id={`${uid}-size`} type="range" min={4} max={30} step={1} value={sized.tileCm ?? 12} className="max-w-[220px] flex-1"
            onChange={(e) => onChange({ ...sized, tileCm: Number(e.target.value) })} />
          <span className="w-14 tabular-nums">{sized.tileCm ?? 12} cm</span>
        </div>
      )}
    </div>
  );
}
