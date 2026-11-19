"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { useStore, useHydrated } from "@/lib/store";
import { IconBook, IconCalc, IconHome, IconNeedle, IconRuler, IconSearch, IconStudio, IconUsers } from "./icons";
import Onboarding from "./Onboarding";
import Toaster from "./Toaster";
import UnitToggle from "./UnitToggle";
import LangToggle from "./LangToggle";
import { dirOf, setActiveLang, useLang, useT, type Lang, type MessageKey } from "@/lib/i18n";

const NAV: { href: string; label: MessageKey; icon: typeof IconHome; mobile: boolean }[] = [
  { href: "/", label: "nav.home", icon: IconHome, mobile: true },
  { href: "/explore", label: "nav.explore", icon: IconSearch, mobile: true },
  { href: "/community", label: "nav.community", icon: IconUsers, mobile: true },
  { href: "/techniques", label: "nav.learn", icon: IconBook, mobile: true },
  { href: "/patterns", label: "garments.nav", icon: IconRuler, mobile: false },
  { href: "/calculator", label: "nav.calculator", icon: IconCalc, mobile: false },
  { href: "/studio", label: "nav.studio", icon: IconStudio, mobile: true },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const t = useT();
  const lang = useLang();
  const textScale = useStore((s) => s.profile.textScale);
  const contrast = useStore((s) => s.profile.contrast);
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.profile.onboarded);
  const immersive = /\/(sew|print)\/?$/.test(path); // trailingSlash export: paths may end in "/"

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", String(textScale));
    document.body.classList.toggle("hc", contrast);
  }, [textScale, contrast]);

  // `shown` lags `lang` by one commit: tr() switches language in the effect, then the page remounts
  // (key) so every render-time tr() label picks it up. Keeps hydration identical to the static HTML.
  const [shown, setShown] = useState<Lang>("en");
  useEffect(() => {
    setActiveLang(lang);
    setShown(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sw.js`).catch(() => {});
    }
  }, []);

  if (immersive) return <><Fragment key={shown}>{children}</Fragment><Toaster raised /></>;

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 btn btn-secondary">{t("shell.skip")}</a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur no-print">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:gap-6 md:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-terra text-white"><IconNeedle size={18} /></span>
            SewCraft
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label={t("nav.main")}>
            {NAV.slice(1).map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium ${active(n.href) ? "bg-beige text-ink" : "text-ink-soft hover:text-ink"}`}>
                {t(n.label)}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <Link href="/explore?focus=1" className="btn-icon" aria-label={t("shell.search")} title={t("shell.searchTitle")}><IconSearch size={18} /></Link>
            <LangToggle />
            <UnitToggle />
          </div>
        </div>
      </header>
      <main id="main" className="pb-24 md:pb-12"><Fragment key={shown}>{children}</Fragment></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur md:hidden no-print" aria-label={t("nav.main")}>
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => n.mobile).map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active(n.href) ? "text-terra" : "text-ink-soft"}`}>
                <n.icon size={22} />
                {t(n.label === "nav.studio" ? "nav.studioShort" : n.label)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {hydrated && !onboarded && <Onboarding />}
      <Toaster />
    </>
  );
}
