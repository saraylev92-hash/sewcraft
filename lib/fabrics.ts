// "Preview with your fabric": optional per-material fabric looks. Presets are tiny generated SVG
// tiles; photos and stash fabrics are raster data URLs. Both render through one image-pattern path.
import type { Project } from "./types";
import type { StashFabric } from "./store";
import { darken, mix } from "./color";

export type FabricChoice =
  | { kind: "preset"; presetId: string; color: string }
  | { kind: "photo"; src: string; avg: string; tileCm?: number }
  | { kind: "stash"; stashId: string; tileCm?: number };

export interface Skin { href: string; tileCm: number; avg: string }

const S = 60; // tile size in px (viewBox units)
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}</svg>`;
const bg = (c: string) => `<rect width="${S}" height="${S}" fill="${c}"/>`;

export interface Preset { id: string; name: string; tileCm: number; tile: (color: string) => string }

export const PRESETS: Preset[] = [
  {
    id: "stripes", name: "Stripes", tileCm: 8,
    tile: (c) => svg(bg(mix(c, "#ffffff", 0.78)) + [0, 30].map((x) => `<rect x="${x}" y="0" width="15" height="${S}" fill="${c}"/>`).join("")),
  },
  {
    id: "gingham", name: "Gingham", tileCm: 8,
    tile: (c) => svg(bg("#fbf8f3") + `<rect x="0" y="0" width="30" height="${S}" fill="${c}" opacity="0.45"/><rect x="0" y="0" width="${S}" height="30" fill="${c}" opacity="0.45"/>`),
  },
  {
    id: "dots", name: "Polka dots", tileCm: 6,
    tile: (c) => svg(bg(mix(c, "#ffffff", 0.82)) + `<circle cx="15" cy="15" r="7" fill="${c}"/><circle cx="45" cy="45" r="7" fill="${c}"/>`),
  },
  {
    id: "floral", name: "Small floral", tileCm: 10,
    tile: (c) => {
      const flower = (x: number, y: number) =>
        [0, 72, 144, 216, 288].map((a) => `<circle cx="${x + 5 * Math.cos((a * Math.PI) / 180)}" cy="${y + 5 * Math.sin((a * Math.PI) / 180)}" r="3.4" fill="${c}"/>`).join("") +
        `<circle cx="${x}" cy="${y}" r="2.4" fill="${mix(c, "#ffe9a8", 0.75)}"/>`;
      const leaf = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="1.8" fill="${darken(mix(c, "#7fa07a", 0.7), 0.1)}" transform="rotate(35 ${x} ${y})"/>`;
      return svg(bg(mix(c, "#ffffff", 0.88)) + flower(15, 15) + flower(45, 45) + leaf(32, 18) + leaf(14, 40) + leaf(52, 20) + leaf(30, 52));
    },
  },
  {
    id: "denim", name: "Denim twill", tileCm: 5,
    tile: (c) => svg(bg(c) + Array.from({ length: 12 }, (_, i) => `<line x1="${i * 10 - 10}" y1="${S}" x2="${i * 10 + 50}" y2="-10" stroke="${mix(c, "#ffffff", 0.22)}" stroke-width="2" opacity="0.7"/>`).join("") + `<rect width="${S}" height="${S}" fill="${darken(c, 0.2)}" opacity="0.12"/>`),
  },
  {
    id: "linen", name: "Linen slub", tileCm: 6,
    tile: (c) => {
      const base = mix(c, "#ffffff", 0.2);
      const slubs = [[4, 6, 18], [30, 14, 24], [10, 26, 20], [36, 38, 18], [2, 48, 26], [28, 54, 20], [44, 22, 14]];
      return svg(bg(base) + slubs.map(([x, y, w], i) => `<rect x="${x}" y="${y}" width="${w}" height="1.4" fill="${i % 2 ? darken(c, 0.15) : mix(c, "#ffffff", 0.55)}" opacity="0.6"/>`).join("") + Array.from({ length: 10 }, (_, i) => `<rect x="${i * 6 + 2}" y="0" width="0.8" height="${S}" fill="${darken(c, 0.2)}" opacity="0.1"/>`).join(""));
    },
  },
  {
    id: "chevron", name: "Chevron", tileCm: 8,
    tile: (c) => svg(bg(mix(c, "#ffffff", 0.8)) + [0, 30].map((y) => `<polyline points="0,${y + 20} 30,${y} 60,${y + 20}" fill="none" stroke="${c}" stroke-width="9"/>`).join("")),
  },
  {
    id: "plaid", name: "Plaid", tileCm: 12,
    tile: (c) => svg(bg(mix(c, "#ffffff", 0.7)) + `<rect x="6" width="18" height="${S}" fill="${c}" opacity="0.5"/><rect y="6" width="${S}" height="18" fill="${c}" opacity="0.5"/><rect x="40" width="4" height="${S}" fill="${darken(c, 0.5)}" opacity="0.75"/><rect y="40" width="${S}" height="4" fill="${darken(c, 0.5)}" opacity="0.75"/>`),
  },
];

const cache = new Map<string, string>();
export function presetHref(presetId: string, color: string): string | null {
  const key = `${presetId}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pr = PRESETS.find((x) => x.id === presetId);
  if (!pr) return null;
  const href = `data:image/svg+xml,${encodeURIComponent(pr.tile(color))}`;
  cache.set(key, href);
  return href;
}

function avgOfPreset(presetId: string, color: string) {
  // Light-ish prints read as a blend of the tint and white; keep it close to the swatch.
  return presetId === "denim" || presetId === "linen" ? color : mix(color, "#ffffff", 0.35);
}

/** Skins keyed by material id AND by every piece id cut from that material (scenes use either). */
export function resolveSkins(
  project: Pick<Project, "materials" | "pieces">,
  fabrics: Record<string, FabricChoice> | undefined,
  stash: StashFabric[],
): Record<string, Skin> {
  const out: Record<string, Skin> = {};
  if (!fabrics) return out;
  for (const m of project.materials) {
    const ch = fabrics[m.id];
    if (!ch) continue;
    let skin: Skin | null = null;
    if (ch.kind === "preset") {
      const pr = PRESETS.find((x) => x.id === ch.presetId);
      const href = presetHref(ch.presetId, ch.color);
      if (pr && href) skin = { href, tileCm: pr.tileCm, avg: avgOfPreset(ch.presetId, ch.color) };
    } else if (ch.kind === "photo") {
      skin = { href: ch.src, tileCm: ch.tileCm ?? 12, avg: ch.avg };
    } else {
      const f = stash.find((x) => x.id === ch.stashId);
      if (f?.photo) skin = { href: f.photo, tileCm: ch.tileCm ?? 12, avg: f.color };
    }
    if (!skin) continue;
    out[m.id] = skin;
    for (const pc of project.pieces) if (pc.materialId === m.id) out[pc.id] = skin;
  }
  return out;
}

/** Average colour of a data-URL image (downsampled on a canvas). Falls back to mid-grey on failure. */
export async function averageColor(src: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 16, 16);
    const d = ctx.getImageData(0, 0, 16, 16).data;
    let r = 0, g = 0, b = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const h = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  } catch {
    return "#B8AD9E";
  }
}
