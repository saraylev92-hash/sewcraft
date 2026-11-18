"use client";
import { toast } from "@/lib/toast";
import Link from "next/link";
import type { Material, Project, Tool } from "@/lib/types";
import { interpolate } from "@/lib/formula";
import { boltWidth, fabricAmount, len } from "@/lib/units";
import { update, useStore } from "@/lib/store";
import type { useProject } from "@/lib/useProject";
import { tr, useT } from "@/lib/i18n";
import { IconCheck } from "../icons";

type Status = "have" | "skip" | "need";

export function materialQuantity(m: Material, ps: ReturnType<typeof useProject>): string {
  const n = ps.needs.find((x) => x.material.id === m.id);
  if (n) return n.fits ? tr("project.check.qty", { amount: fabricAmount(n.need.totalCm, ps.units), width: boltWidth(n.width, ps.units) }) : tr("project.check.noFit", { width: boltWidth(n.width, ps.units) });
  return m.quantity ? interpolate(m.quantity, ps.vars, (cm) => len(cm, ps.units)) : "";
}

export function readiness(p: Project, checklist: Record<string, Status>) {
  const required = [...p.tools.filter((t) => t.required).map((t) => `tool:${t.id}`), ...p.materials.filter((m) => m.required).map((m) => `mat:${m.id}`)];
  const reviewed = required.filter((id) => checklist[id]);
  const toBuy = required.filter((id) => checklist[id] === "need");
  return { total: required.length, reviewed: reviewed.length, toBuy: toBuy.length, ready: reviewed.length === required.length };
}

export default function Checklist({ p, ps }: { p: Project; ps: ReturnType<typeof useProject> }) {
  const t = useT();
  const checklist = ps.prefs.checklist;
  const r = readiness(p, checklist);
  const onList = useStore((s) => s.shopping.projects.includes(p.id));

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center gap-4 rounded-2xl p-4 ${r.ready ? "bg-sage-soft" : "bg-beige"}`} role="status">
        <div className={`grid h-12 w-12 place-items-center rounded-full ${r.ready ? "bg-sage text-white" : "bg-paper text-ink-soft"}`}>
          {r.ready ? <IconCheck /> : <span className="text-sm font-bold">{r.reviewed}/{r.total}</span>}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{r.ready ? (r.toBuy ? t(r.toBuy > 1 ? "project.check.reviewedMany" : "project.check.reviewedOne", { n: r.toBuy }) : t("project.check.ready")) : t("project.check.review")}</p>
          <p className="text-sm text-ink-soft">{t("project.check.hint")}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { update((s) => { s.shopping.projects = onList ? s.shopping.projects.filter((x) => x !== p.id) : [...s.shopping.projects, p.id]; }); toast(onList ? t("project.check.shopRemoved") : t("project.check.shopAdded"), { tone: onList ? "default" : "success", action: onList ? undefined : { label: t("project.viewDone"), run: () => { location.href = "/studio?tab=shopping"; } } }); }}>
          {onList ? t("project.check.onList") : t("project.check.addList")}
        </button>
      </div>

      <section aria-labelledby="mat-h">
        <h3 id="mat-h" className="mb-3 font-display text-xl font-semibold">{t("project.check.materials")}</h3>
        <ul className="space-y-3">
          {p.materials.map((m) => (
            <ItemRow key={m.id} id={`mat:${m.id}`} name={m.name} required={m.required} status={checklist[`mat:${m.id}`]} onSet={(v) => ps.setCheck(`mat:${m.id}`, v)}
              swatch={m.swatch} qty={materialQuantity(m, ps)} why={m.why} subs={m.alternatives}>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {m.recommended && <Detail k={t("project.check.recommended")} v={m.recommended.join(", ")} />}
                {m.weight && <Detail k={t("project.check.weight")} v={m.weight} />}
                {m.minWidthCm && <Detail k={t("project.check.minWidth")} v={boltWidth(m.minWidthCm, ps.units)} />}
                {m.layout && <Detail k={t("project.check.piecesFrom")} v={p.pieces.filter((x) => x.materialId === m.id).map((x) => `${x.name} ×${x.quantity}`).join(", ")} />}
              </dl>
              {m.layout && <p className="mt-2 text-xs text-ink-soft">{t("project.check.layoutNote")}</p>}
            </ItemRow>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tool-h">
        <h3 id="tool-h" className="mb-3 font-display text-xl font-semibold">{t("project.check.tools")}</h3>
        <ul className="space-y-3">
          {p.tools.map((t: Tool) => (
            <ItemRow key={t.id} id={`tool:${t.id}`} name={t.name} required={t.required} status={checklist[`tool:${t.id}`]} onSet={(v) => ps.setCheck(`tool:${t.id}`, v)} why={t.why} subs={t.substitutes} />
          ))}
        </ul>
      </section>
      <p className="text-sm text-ink-soft">{t("project.check.newToPre")}<Link href="/techniques" className="font-semibold text-terra underline">{t("project.check.newToLink")}</Link>.</p>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-ink-soft">{k}</dt><dd>{v}</dd></div>;
}

function ItemRow({ id, name, required, status, onSet, swatch, qty, why, subs, children }: {
  id: string; name: string; required: boolean; status?: Status; onSet: (v: Status | null) => void; swatch?: string; qty?: string; why: string; subs?: string[]; children?: React.ReactNode;
}) {
  const t = useT();
  const opts: [Status, string][] = [["have", t("project.check.have")], ["need", t("project.check.need")], ...(required ? [] : [["skip", t("project.check.skip")] as [Status, string]])];
  if (required) opts.push(["skip", t("project.check.skip")]);
  return (
    <li className={`card p-4 ${status === "have" ? "border-sage" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        {swatch && <span className="mt-0.5 h-10 w-10 shrink-0 rounded-lg border border-black/10" style={{ background: swatch }} aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{name}</span>
            <span className={`chip !text-[10px] uppercase ${required ? "!bg-terra-soft text-[#8a3a22]" : ""}`}>{required ? t("project.check.required") : t("project.check.optional")}</span>
          </p>
          {qty && <p className="mt-0.5 font-semibold text-terra">{qty}</p>}
          <p className="mt-1 text-sm text-ink-soft">{why}</p>
          {subs && subs.length > 0 && <p className="mt-1 text-sm"><span className="text-ink-soft">{t("project.check.substitutes")} </span>{subs.join(" · ")}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("project.check.statusFor", { name })}>
          {opts.map(([v, l]) => (
            <button key={v} className="chip chip-toggle !min-h-[40px]" aria-pressed={status === v} onClick={() => onSet(status === v ? null : v)} data-id={id}>{v === "have" && status === v ? "✓ " : ""}{l}</button>
          ))}
        </div>
      </div>
      {children}
    </li>
  );
}
