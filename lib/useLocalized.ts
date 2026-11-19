"use client";
import { useMemo } from "react";
import type { Project } from "./types";
import { localizeProject } from "./localize";
import { useLang } from "./i18n";

/** The project in the reader's language (English fields where no translation exists). */
export function useLocalizedProject(p: Project): Project {
  const lang = useLang();
  return useMemo(() => localizeProject(p, lang), [p, lang]);
}

/** "none" when reading Hebrew but the guide has no Hebrew yet; "draft" for an unreviewed translation. */
export function useTranslationState(p: Project): "en" | "none" | "draft" | "reviewed" {
  const lang = useLang();
  if (lang === "en") return "en";
  return p.i18n?.he ? p.i18n.he.status : "none";
}
