"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { GlossaryTerm } from "@/lib/types";
import { useT } from "@/lib/i18n";

function buildRegex(terms: GlossaryTerm[]) {
  const words = terms.flatMap((t) => [t.term, ...(t.aliases ?? [])]).sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
}

export function findTerms(text: string, terms: GlossaryTerm[]): GlossaryTerm[] {
  const re = buildRegex(terms);
  const found = new Map<string, GlossaryTerm>();
  for (const m of text.matchAll(re)) {
    const t = terms.find((x) => [x.term, ...(x.aliases ?? [])].some((w) => w.toLowerCase() === m[0].toLowerCase()));
    if (t) found.set(t.term, t);
  }
  return [...found.values()];
}

/** Renders text with sewing terms underlined; tapping one shows its definition inline. */
export default function GlossaryText({ text, terms, enabled }: { text: string; terms: GlossaryTerm[]; enabled: boolean }) {
  const t0 = useT();
  const [open, setOpen] = useState<string | null>(null);
  const re = useMemo(() => buildRegex(terms), [terms]);
  if (!enabled) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let last = 0;
  const seen = new Set<string>();
  for (const m of text.matchAll(re)) {
    const t = terms.find((x) => [x.term, ...(x.aliases ?? [])].some((w) => w.toLowerCase() === m[0].toLowerCase()));
    if (!t || seen.has(t.term)) continue;
    seen.add(t.term);
    parts.push(text.slice(last, m.index));
    const isOpen = open === t.term;
    parts.push(
      <span key={m.index} className="relative">
        <button type="button" onClick={() => setOpen(isOpen ? null : t.term)} aria-expanded={isOpen}
          className="rounded font-medium underline decoration-terra decoration-dotted decoration-2 underline-offset-4 hover:bg-terra-soft">
          {m[0]}
        </button>
        {isOpen && (
          <span role="note" className="mx-1 my-1 block rounded-xl bg-sage-soft p-3 text-sm font-normal leading-snug text-ink">
            <strong className="capitalize">{t.term}:</strong> {t.definition}
            {t.technique && <> <Link href={`/techniques/${t.technique}`} className="font-semibold text-terra">{t0("sew.learnMore")}</Link></>}
          </span>
        )}
      </span>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
