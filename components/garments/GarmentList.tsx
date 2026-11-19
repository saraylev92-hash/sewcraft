"use client";
import Link from "next/link";
import { DESIGNS } from "@/lib/garments/designs";
import { useLang, useT } from "@/lib/i18n";

export default function GarmentList() {
  const t = useT();
  const lang = useLang();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">{t("garments.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t("garments.subtitle")}</p>
      <p className="mt-1 text-sm text-ink-soft">{t("garments.poweredBy")}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DESIGNS.map((d) => (
          <li key={d.id} className="card flex flex-col p-5">
            <h2 className="font-display text-xl font-semibold">{d.name[lang]}</h2>
            <p className="mt-1 text-sm text-ink-soft">{d.blurb[lang]}</p>
            <p className="mt-3 text-xs text-ink-soft">{d.fabric[lang]} · {t("garments.difficulty", { n: d.difficulty })}</p>
            <p className="text-xs text-ink-soft">{t("garments.designer", { name: d.designer })}</p>
            <Link href={`/patterns/${d.id}`} className="btn btn-primary mt-4 self-start">{t("garments.open")}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
