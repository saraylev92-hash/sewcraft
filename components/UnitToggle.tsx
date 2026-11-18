"use client";
import { update, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function UnitToggle({ className = "" }: { className?: string }) {
  const units = useStore((s) => s.profile.units);
  const t = useT();
  return (
    <div className={`inline-flex rounded-full border border-line bg-paper p-0.5 text-xs font-semibold ${className}`} role="group" aria-label={t("units.label")}>
      {(["metric", "imperial"] as const).map((u) => (
        <button
          key={u}
          aria-pressed={units === u}
          onClick={() => update((s) => void (s.profile.units = u))}
          className={`min-h-[32px] rounded-full px-3 ${units === u ? "bg-ink text-cream" : "text-ink-soft"}`}
        >
          {u === "metric" ? "cm" : "in"}
        </button>
      ))}
    </div>
  );
}
