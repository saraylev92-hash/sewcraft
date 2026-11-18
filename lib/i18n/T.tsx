"use client";
// <T k="home.hero" /> — a translated string usable inside server components (pages under app/).
import { useT, type MessageKey, type Vars } from "./index";

export default function T({ k, vars }: { k: MessageKey; vars?: Vars }) {
  const t = useT();
  return <>{t(k, vars)}</>;
}
