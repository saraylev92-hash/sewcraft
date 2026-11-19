// Registry of UI message files. Each area owns one file so they can be edited independently.
// To add an area: create messages/<area>.ts (same shape as common.ts) and add it to FILES.
import common from "./common";
import project from "./project";
import sew from "./sew";
import discover from "./discover";
import learn from "./learn";
import studio from "./studio";
import community from "./community";
import garments from "./garments";

const FILES = [common, project, sew, discover, learn, studio, community, garments] as const;

type Merge<T extends readonly { en: Record<string, string> }[]> = T[number]["en"];
type EnAll = { [K in keyof UnionToIntersection<Merge<typeof FILES>>]: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

export type MessageKey = keyof EnAll & string;

function merge(lang: "en" | "he"): Record<MessageKey, string> {
  const out: Record<string, string> = {};
  for (const f of FILES) {
    for (const [k, v] of Object.entries(f[lang])) {
      if (lang === "en" && k in out) throw new Error(`Duplicate UI message key: ${k}`);
      out[k] = v;
    }
  }
  return out as Record<MessageKey, string>;
}

export const MESSAGES: Record<"en" | "he", Record<MessageKey, string>> = { en: merge("en"), he: merge("he") };
