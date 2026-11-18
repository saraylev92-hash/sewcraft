"use client";
import { useState } from "react";
import { update } from "@/lib/store";
import type { Level, Units } from "@/lib/types";
import { tr, useT, type MessageKey } from "@/lib/i18n";

function equip(id: string, key: MessageKey) {
  // `label` is resolved on access so it follows the current UI language.
  return { id, key, get label() { return tr(key); } };
}

export const EQUIPMENT = [
  equip("machine", "discover.equip.machine"),
  equip("iron", "discover.equip.iron"),
  equip("scissors", "discover.equip.scissors"),
  equip("rotary", "discover.equip.rotary"),
  equip("zip-foot", "discover.equip.zipFoot"),
  equip("serger", "discover.equip.serger"),
];

const LEVELS: { id: Level; title: MessageKey; body: MessageKey }[] = [
  { id: "beginner", title: "discover.ob.beginnerTitle", body: "discover.ob.beginnerBody" },
  { id: "standard", title: "discover.ob.standardTitle", body: "discover.ob.standardBody" },
  { id: "expert", title: "discover.ob.expertTitle", body: "discover.ob.expertBody" },
];

export default function Onboarding() {
  const t = useT();
  const [level, setLevel] = useState<Level>("beginner");
  const [units, setUnits] = useState<Units>("metric");
  const [eq, setEq] = useState<string[]>(["machine", "iron", "scissors"]);

  const finish = (skip = false) =>
    update((s) => {
      s.profile.onboarded = true;
      if (!skip) {
        s.profile.level = level;
        s.profile.units = units;
        s.profile.equipment = eq;
      }
    });

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-paper p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-terra">{t("discover.ob.welcome")}</p>
        <h2 id="ob-title" className="mt-1 font-display text-2xl font-semibold">{t("discover.ob.title")}</h2>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">{t("discover.ob.experience")}</legend>
          <div className="grid gap-2">
            {LEVELS.map((l) => (
              <label key={l.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${level === l.id ? "border-terra bg-terra-soft" : "border-line"}`}>
                <input type="radio" name="level" className="mt-1 accent-[var(--terracotta)]" checked={level === l.id} onChange={() => setLevel(l.id)} />
                <span><span className="block font-semibold">{t(l.title)}</span><span className="text-sm text-ink-soft">{t(l.body)}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">{t("discover.ob.measurements")}</legend>
          <div className="flex gap-2">
            {(["metric", "imperial"] as const).map((u) => (
              <button key={u} type="button" aria-pressed={units === u} onClick={() => setUnits(u)} className="chip chip-toggle">{u === "metric" ? t("discover.ob.metric") : t("discover.ob.imperial")}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">{t("discover.ob.have")}</legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <button key={e.id} type="button" aria-pressed={eq.includes(e.id)} onClick={() => setEq((x) => (x.includes(e.id) ? x.filter((y) => y !== e.id) : [...x, e.id]))} className="chip chip-toggle">{t(e.key)}</button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button className="btn btn-ghost" onClick={() => finish(true)}>{t("discover.ob.skip")}</button>
          <button className="btn btn-primary" onClick={() => finish()}>{t("discover.ob.start")}</button>
        </div>
        <p className="mt-3 text-xs text-ink-soft">{t("discover.ob.note")}</p>
      </div>
    </div>
  );
}
