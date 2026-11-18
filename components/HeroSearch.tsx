"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconSearch } from "./icons";
import { useT, type MessageKey } from "@/lib/i18n";

// `q` is the search term (matched against the English guide content); `key` is the label shown in the UI.
export const POPULAR_SEARCHES: { q: string; key: MessageKey }[] = [
  { q: "tote bag", key: "discover.pop.tote" },
  { q: "beginner", key: "discover.pop.beginner" },
  { q: "zipper", key: "discover.pop.zipper" },
  { q: "cushion", key: "discover.pop.cushion" },
  { q: "skirt", key: "discover.pop.skirt" },
  { q: "gifts", key: "discover.pop.gifts" },
  { q: "under 2 hours", key: "discover.pop.under2h" },
];

export default function HeroSearch() {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState("");
  const go = (v: string) => router.push(`/explore?q=${encodeURIComponent(v)}`);
  return (
    <div className="mt-7">
      <form role="search" onSubmit={(e) => { e.preventDefault(); go(q); }} className="flex items-center gap-2 rounded-full border border-line bg-paper p-1.5 ps-5 shadow-[0_10px_30px_-20px_rgba(43,38,34,0.5)]">
        <IconSearch className="shrink-0 text-ink-soft" />
        <label htmlFor="hero-q" className="sr-only">{t("discover.search.placeholder")}</label>
        <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("discover.search.placeholder")} className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-ink-soft/70" />
        <button className="btn btn-primary" type="submit">{t("discover.search.submit")}</button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-soft">{t("discover.search.popularLabel")}</span>
        {POPULAR_SEARCHES.slice(0, 5).map((s) => (
          <button key={s.q} onClick={() => go(s.q)} className="rounded-full px-2 py-1 text-ink-soft underline decoration-line underline-offset-4 hover:text-ink">{t(s.key)}</button>
        ))}
      </div>
    </div>
  );
}
