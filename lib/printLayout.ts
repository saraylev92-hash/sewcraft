// Packs pattern pieces onto one shared print canvas, then splits that canvas into paper-sized tiles.
// Pieces are never rotated (the grainline must stay parallel to the page's long side) and never scaled.
// Tiles that no piece touches are skipped, so small pieces share pages instead of each taking a full sheet.

export interface PrintItem {
  id: string;
  /** Printed width in mm (the half piece for on-fold pieces). */
  w: number;
  h: number;
}

export interface PrintPlacement extends PrintItem {
  x: number;
  y: number;
}

export interface PrintTile {
  r: number;
  c: number;
  /** Page label, e.g. "B2" (column letter, row number). */
  id: string;
}

export interface PrintPlan {
  placements: PrintPlacement[];
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
  /** Tiles that contain part of a piece, in reading order. Only these are printed. */
  tiles: PrintTile[];
  used: (r: number, c: number) => boolean;
}

const EDGE = 6; // mm between the canvas edge and the first piece
const GAP = 12; // mm between pieces

export const tileLabel = (r: number, c: number) => `${colName(c)}${r + 1}`;

function colName(c: number): string {
  let s = "";
  let n = c;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** If [a, a+len) fits in one tile but straddles a tile boundary, push it to the next boundary. */
function snap(a: number, len: number, tile: number): number {
  if (len > tile - 2 * EDGE) return a;
  const start = Math.floor(a / tile);
  const end = Math.floor((a + len - 0.01) / tile);
  return start === end ? a : end * tile + EDGE;
}

function shelfPack(items: PrintItem[], canvasW: number, tileW: number, tileH: number): PrintPlacement[] | null {
  const sorted = [...items].sort((a, b) => b.h - a.h || b.w - a.w);
  const out: PrintPlacement[] = [];
  let y = EDGE, x = EDGE, shelfH = 0;
  for (const it of sorted) {
    if (it.w + 2 * EDGE > canvasW) return null;
    let px = snap(x, it.w, tileW);
    if (px + it.w + EDGE > canvasW) {
      // new shelf
      y = y + shelfH + GAP;
      x = EDGE;
      shelfH = 0;
      px = snap(x, it.w, tileW);
    }
    if (shelfH === 0) y = snap(y, it.h, tileH);
    out.push({ ...it, x: px, y });
    x = px + it.w + GAP;
    shelfH = Math.max(shelfH, it.h);
  }
  return out;
}

function tilesFor(placements: PrintPlacement[], tileW: number, tileH: number) {
  const used = new Set<string>();
  let cols = 1, rows = 1;
  for (const p of placements) {
    const c0 = Math.floor(p.x / tileW), c1 = Math.floor((p.x + p.w - 0.01) / tileW);
    const r0 = Math.floor(p.y / tileH), r1 = Math.floor((p.y + p.h - 0.01) / tileH);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) used.add(`${r},${c}`);
    cols = Math.max(cols, c1 + 1);
    rows = Math.max(rows, r1 + 1);
  }
  return { used, cols, rows };
}

/** Pick the canvas width (in whole tiles) that prints the fewest pages. */
export function planPrint(items: PrintItem[], tileW: number, tileH: number): PrintPlan {
  const widest = Math.max(0, ...items.map((i) => i.w + 2 * EDGE));
  const minCols = Math.max(1, Math.ceil(widest / tileW));
  let best: { placements: PrintPlacement[]; used: Set<string>; cols: number; rows: number } | null = null;
  for (let cols = minCols; cols <= minCols + 5; cols++) {
    const placements = shelfPack(items, cols * tileW, tileW, tileH);
    if (!placements) continue;
    const t = tilesFor(placements, tileW, tileH);
    const score = t.used.size * 1000 + t.cols * t.rows; // fewest pages, then the most compact grid
    const bestScore = best ? best.used.size * 1000 + best.cols * best.rows : Infinity;
    if (score < bestScore) best = { placements, ...t };
  }
  const b = best ?? { placements: [], used: new Set<string>(), cols: 1, rows: 1 };
  const tiles: PrintTile[] = [];
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) if (b.used.has(`${r},${c}`)) tiles.push({ r, c, id: tileLabel(r, c) });
  return { placements: b.placements, cols: b.cols, rows: b.rows, tileW, tileH, tiles, used: (r, c) => b.used.has(`${r},${c}`) };
}
