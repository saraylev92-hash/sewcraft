"use client";
import { update, useStore } from "@/lib/store";
import { LANGS, useT } from "@/lib/i18n";

/** EN | עב switch. AppShell keeps <html lang/dir> in sync; app/layout sets them before first paint. */
export default function LangToggle({ className = "" }: { className?: string }) {
  const lang = useStore((s) => s.profile.lang ?? "en");
  const t = useT();
  return (
    <div className={`inline-flex rounded-full border border-line bg-paper p-0.5 text-xs font-semibold ${className}`} role="group" aria-label={t("lang.label")}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          lang={l.id}
          aria-pressed={lang === l.id}
          aria-label={l.label}
          title={l.label}
          onClick={() => update((s) => void (s.profile.lang = l.id))}
          className={`min-h-[32px] rounded-full px-3 ${lang === l.id ? "bg-ink text-cream" : "text-ink-soft"}`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
