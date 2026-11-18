"use client";
// UI translations. English is the source and the default; Hebrew is a full mirror checked at compile
// time (every messages file types `he` as having exactly the keys of `en`). Guide CONTENT
// (content/*.json) is translated separately — this module only covers interface strings.
//
// Usage in components:   const t = useT();  t("nav.explore")  t("project.steps", { n: 5 })
// Outside React (toasts, lib helpers):  tr("toast.saved")
import { useStore } from "../store";
import { MESSAGES, type MessageKey } from "./messages";

export type Lang = "en" | "he";
export const LANGS: { id: Lang; label: string; short: string; dir: "ltr" | "rtl" }[] = [
  { id: "en", label: "English", short: "EN", dir: "ltr" },
  { id: "he", label: "עברית", short: "עב", dir: "rtl" },
];

export type Vars = Record<string, string | number>;

function format(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const s = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  return format(s, vars);
}

/** Current UI language (English until the store has loaded). */
export function useLang(): Lang {
  return useStore((s) => s.profile.lang ?? "en");
}

/** Translator bound to the current language. */
export function useT() {
  const lang = useLang();
  return (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
}

// Language used by tr(). It stays "en" until AppShell has hydrated, so render-time tr() calls produce the
// same text as the static HTML (React would otherwise report a hydration mismatch). AppShell then sets it
// and remounts the page under the new language.
let active: Lang = "en";
export function setActiveLang(l: Lang) {
  active = l;
}

/** Non-hook translation (toasts, helpers, label getters). */
export function tr(key: MessageKey, vars?: Vars): string {
  return translate(active, key, vars);
}

export function dirOf(lang: Lang): "ltr" | "rtl" {
  return lang === "he" ? "rtl" : "ltr";
}

export type { MessageKey };
