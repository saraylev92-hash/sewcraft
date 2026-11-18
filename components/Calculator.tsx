"use client";
import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import { useProject } from "@/lib/useProject";
import { boltWidth, fabricAmount, len } from "@/lib/units";
import LayoutView from "./LayoutView";
import Customizer from "./project/Customizer";
import { useT } from "@/lib/i18n";

export default function Calculator({ projects }: { projects: Project[] }) {
  const t = useT();
  const [id, setId] = useState(projects[0].id);
  const p = projects.find((x) => x.id === id)!;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">{t("discover.calc.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t("discover.calc.intro")}</p>
      <label className="mt-6 block max-w-md">
        <span className="mb-1 block text-sm font-semibold">{t("discover.calc.project")}</span>
        <select className="input" value={id} onChange={(e) => setId(e.target.value)}>
          {projects.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </select>
      </label>
      <CalcBody key={p.id} p={p} />
    </div>
  );
}

function CalcBody({ p }: { p: Project }) {
  const t = useT();
  const ps = useProject(p);
  const { units } = ps;
  const total = ps.needs.filter((n) => n.material.kind === "fabric");
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Customizer p={p} ps={ps} />
        <Link href={`/projects/${p.id}`} className="btn btn-secondary w-full">{t("discover.calc.open")}</Link>
      </div>
      <div className="space-y-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {ps.needs.map((n) => (
            <div key={n.material.id} className="card p-4">
              <p className="text-xs uppercase tracking-wide text-ink-soft">{n.material.kind === "interfacing" ? t("discover.calc.interfacing") : n.material.name.split("—")[0]}</p>
              <p className="font-display text-3xl font-semibold text-terra">{n.fits ? fabricAmount(n.need.totalCm, units) : t("discover.calc.noFit")}</p>
              <p className="text-xs text-ink-soft">{boltWidth(n.width, units)} · {n.mode === "folded" ? t("discover.calc.modeFolded") : t("discover.calc.modeSingle")}{n.autoSwitched ? t("discover.calc.auto") : ""}</p>
            </div>
          ))}
        </div>
        {total.length > 1 && <p className="text-sm text-ink-soft">{t("discover.calc.separate")}</p>}
        {ps.needs.map((n) => {
          const m = n.material;
          const waste = n.need.layout.fabricArea ? Math.max(0, Math.round((1 - n.need.layout.piecesArea / n.need.layout.fabricArea) * 100)) : 0;
          return (
            <section key={m.id} className="space-y-3">
              <h2 className="font-display text-xl font-semibold">{m.name}</h2>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <label><span className="mb-1 block font-semibold">{t("discover.calc.width", { unit: t(units === "imperial" ? "discover.unit.in" : "discover.unit.cm") })}</span>
                  <input className="input" type="number" min={30} max={320} value={units === "imperial" ? Math.round(n.width / 2.54) : n.width}
                    onChange={(e) => { const v = Number(e.target.value); if (v > 0) ps.setLayout(m.id, { width: units === "imperial" ? Math.round(v * 2.54) : v }); }} />
                  <span className="mt-1 flex gap-1">{m.layout!.widths.map((w) => <button key={w} className="chip chip-toggle !min-h-[28px] !text-xs" aria-pressed={n.width === w} onClick={() => ps.setLayout(m.id, { width: w })}>{boltWidth(w, units)}</button>)}</span>
                </label>
                <label><span className="mb-1 block font-semibold">{t("discover.calc.layout")}</span>
                  <select className="input" value={n.mode} onChange={(e) => ps.setLayout(m.id, { mode: e.target.value as "folded" | "single" })}>
                    <option value="folded">{t("discover.calc.folded")}</option><option value="single">{t("discover.calc.single")}</option>
                  </select></label>
                <label><span className="mb-1 block font-semibold">{t("discover.calc.direction")}</span>
                  <select className="input" value={n.directional ? "1" : "0"} onChange={(e) => ps.setLayout(m.id, { directional: e.target.value === "1" })}>
                    <option value="0">{t("discover.calc.nonDirectional")}</option><option value="1">{t("discover.calc.oneWayOpt")}</option>
                  </select></label>
                <label><span className="mb-1 block font-semibold">{t("discover.calc.shrinkage")}</span>
                  <select className="input" value={n.shrink} onChange={(e) => ps.setLayout(m.id, { shrink: Number(e.target.value) })}>
                    {[0, 3, 5, 8].map((s) => <option key={s} value={s}>{s ? t("discover.calc.shrinkPct", { pct: s }) : t("discover.calc.shrinkNone")}</option>)}
                  </select></label>
              </div>
              {n.need.layout.overflow.length > 0 ? (
                <p className="rounded-xl bg-terra-soft p-3 text-sm" role="alert">{t("discover.calc.overflow", { names: n.need.layout.overflow.map((o) => o.name).join(", ") })}</p>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                  <LayoutView layout={n.need.layout} units={units} swatch={m.swatch} title={t("discover.calc.layoutTitle", { name: m.name })} />
                  <dl className="card h-fit space-y-1 p-4 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-soft">{t("discover.calc.layout")}</dt><dd>{len(n.need.layout.lengthUsed, units)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-soft">{t("discover.calc.shrinkageShort")}</dt><dd>+{len(n.need.shrinkCm, units)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-soft">{t("discover.calc.margin")}</dt><dd>+{len(n.need.marginCm, units)}</dd></div>
                    <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>{t("discover.calc.buy")}</dt><dd className="text-terra">{fabricAmount(n.need.totalCm, units)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-soft">{t("discover.calc.unused")}</dt><dd>~{waste}%</dd></div>
                    <p className="pt-2 text-xs text-ink-soft">{n.directional ? t("discover.calc.oneWay") : t("discover.calc.either")} {t("discover.calc.rounded")}</p>
                  </dl>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
