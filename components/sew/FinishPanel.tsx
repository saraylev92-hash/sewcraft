"use client";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/types";
import { useStore, withProgress } from "@/lib/store";
import { useProject } from "@/lib/useProject";
import SceneView from "../scene/SceneView";

export default function FinishPanel({ p, onBack }: { p: Project; onBack: () => void }) {
  const ps = useProject(p);
  const prog = useStore((s) => s.progress[p.id]);
  const units = useStore((s) => s.profile.units);
  const j = prog?.journal ?? {};
  const [saved, setSaved] = useState(false);
  const photos = Object.values(prog?.photos ?? {}).flat();
  const set = (patch: Partial<NonNullable<typeof j>>) => withProgress(p.id, (pr) => { pr.journal = { ...pr.journal, ...patch }; });

  return (
    <div className="min-h-[100dvh] bg-cream px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-5xl" aria-hidden>🎉</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">You made it!</h1>
          <p className="mt-2 text-ink-soft">{p.title} is complete{prog?.completedAt ? ` — ${new Date(prog.completedAt).toLocaleDateString()}` : ""}. Add it to your sewing journal.</p>
        </div>
        <div className="card mx-auto mt-6 max-w-sm overflow-hidden"><SceneView scene={p.gallery[0].scene} tones={ps.tones} skins={ps.skins} vars={{}} units={units} title={`Finished ${p.title}`} /></div>

        <form className="card mt-6 space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); setSaved(true); toast("Saved to your sewing journal", { tone: "success" }); }}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">How difficult did it feel?</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} aria-pressed={j.rating === n} onClick={() => set({ rating: n })} className="chip chip-toggle !min-h-[44px] !min-w-[44px] justify-center">{n}</button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-soft">1 = easy, 5 = very challenging</p>
          </fieldset>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Fabric used</span>
            <input className="input" value={j.fabric ?? ""} onChange={(e) => set({ fabric: e.target.value })} placeholder="e.g. rust duck canvas + sage cotton lining" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Modifications</span>
            <input className="input" value={j.mods ?? ""} onChange={(e) => set({ mods: e.target.value })} placeholder="e.g. added 4 cm to the handles" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Notes</span>
            <textarea className="input py-2" rows={3} value={j.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="What went well? What would you change next time?" /></label>
          {photos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Your progress photos</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="flex flex-wrap gap-2">{photos.map((s, i) => <img key={i} src={s} alt="" className="h-20 w-20 rounded-lg object-cover" />)}</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="btn btn-primary">{saved ? "Saved ✓" : "Save to journal"}</button>
            <Link href="/studio?tab=completed" className="btn btn-secondary">Open My Studio</Link>
            <button type="button" onClick={onBack} className="btn btn-ghost">Back to steps</button>
          </div>
          <p className="text-xs text-ink-soft">Journal entries save automatically as you type.</p>
        </form>
      </div>
    </div>
  );
}
