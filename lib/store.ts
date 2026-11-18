"use client";
// User state, kept separate from project definitions. Persisted to localStorage behind a tiny
// repository interface so it can be swapped for Supabase (see README) without touching components.
import { useSyncExternalStore } from "react";
import type { Level, Units } from "./types";
import { toast } from "./toast";
import type { FabricChoice } from "./fabrics";

export interface Journal {
  rating?: number; // difficulty 1–5
  notes?: string;
  fabric?: string;
  mods?: string;
}

export interface ProjectProgress {
  startedAt: number;
  updatedAt: number;
  current: number;
  done: string[];
  notes: Record<string, string>;
  bookmarks: string[];
  photos: Record<string, string[]>;
  completedAt?: number;
  journal?: Journal;
}

/** Per-project choices made before (or without) starting: size, checklist, layout settings. */
export interface ProjectPrefs {
  params?: Record<string, number>;
  sizeId?: string;
  checklist: Record<string, "have" | "skip" | "need">;
  layout: Record<string, { width?: number; mode?: "folded" | "single"; directional?: boolean; shrink?: number }>;
  /** Optional "preview with your fabric" look per material id. Absent = default flat colour. */
  fabrics?: Record<string, FabricChoice>;
}

export interface StashFabric {
  id: string;
  type: string;
  color: string;
  widthCm: number;
  lengthCm: number;
  photo?: string;
}

/** A guide authored in the builder. `raw` uses the same compact JSON schema as content files. */
export interface LocalGuide {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  status: "draft" | "shared";
  updatedAt: number;
}

export interface State {
  v: 1;
  profile: {
    onboarded: boolean;
    level: Level;
    units: Units;
    equipment: string[];
    favCategories: string[];
    textScale: number;
    contrast: boolean;
    timeAvailable?: number;
    keepAwake?: boolean;
  };
  favorites: string[];
  recent: { id: string; at: number }[];
  progress: Record<string, ProjectProgress>;
  prefs: Record<string, ProjectPrefs>;
  stash: StashFabric[];
  shopping: { projects: string[]; checked: Record<string, boolean> };
  guides: Record<string, LocalGuide>;
}

const KEY = "sewcraft:v1";

export const DEFAULT_STATE: State = {
  v: 1,
  profile: { onboarded: false, level: "standard", units: "metric", equipment: ["machine", "iron", "scissors"], favCategories: [], textScale: 1, contrast: false },
  favorites: [],
  recent: [],
  progress: {},
  prefs: {},
  stash: [],
  shopping: { projects: [], checked: {} },
  guides: {},
};

// ---- repository (swap point for a remote backend) ----
interface Repo {
  load(): State | null;
  save(s: State): void;
}
const localRepo: Repo = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as State;
      return { ...DEFAULT_STATE, ...s, profile: { ...DEFAULT_STATE.profile, ...s.profile } };
    } catch {
      return null;
    }
  },
  save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      console.warn("SewCraft: could not save (storage full?)", e);
      window.dispatchEvent(new CustomEvent("sewcraft:save-error"));
    }
  },
};

let state: State = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = localRepo.load() ?? DEFAULT_STATE;
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = localRepo.load() ?? DEFAULT_STATE;
      listeners.forEach((l) => l());
    }
  });
}

export function getState(): State {
  ensureLoaded();
  return state;
}

export function update(fn: (draft: State) => void) {
  ensureLoaded();
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  localRepo.save(state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(getState()), () => sel(DEFAULT_STATE));
}

/** True once the client has read persisted state (avoids flashing defaults). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// ---- helpers ----
export function newProgress(): ProjectProgress {
  const now = Date.now();
  return { startedAt: now, updatedAt: now, current: 0, done: [], notes: {}, bookmarks: [], photos: {} };
}

export const EMPTY_PREFS: ProjectPrefs = { checklist: {}, layout: {} };

export function withPrefs(id: string, fn: (p: ProjectPrefs) => void) {
  update((s) => {
    const p = s.prefs[id] ?? { checklist: {}, layout: {} };
    fn(p);
    s.prefs[id] = p;
  });
}

export function withProgress(id: string, fn: (p: ProjectProgress) => void) {
  update((s) => {
    const p = s.progress[id] ?? newProgress();
    fn(p);
    p.updatedAt = Date.now();
    s.progress[id] = p;
  });
}

export function toggleFavorite(id: string, title?: string) {
  let added = false;
  update((s) => {
    added = !s.favorites.includes(id);
    s.favorites = added ? [id, ...s.favorites] : s.favorites.filter((x) => x !== id);
  });
  toast(added ? `Saved${title ? ` “${title}”` : ""} to favourites` : "Removed from favourites", {
    tone: added ? "success" : "default",
    action: added ? undefined : { label: "Undo", run: () => update((s) => { if (!s.favorites.includes(id)) s.favorites.unshift(id); }) },
  });
}

export function markViewed(id: string) {
  update((s) => {
    s.recent = [{ id, at: Date.now() }, ...s.recent.filter((r) => r.id !== id)].slice(0, 12);
  });
}

/** Downscale an image file to a JPEG data URL so progress photos fit in local storage. */
export async function compressImage(file: File, max = 900): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}
