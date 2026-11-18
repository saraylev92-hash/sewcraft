"use client";
// Interactive cutting layout. All geometry comes from lib/layout.ts (pattern data → packer).
import { useId, useState } from "react";
import type { LayoutResult, Placement } from "@/lib/layout";
import type { Units } from "@/lib/types";
import { darken, mix } from "@/lib/color";
import type { Skin } from "@/lib/fabrics";
import { lenNum, unitSuffix } from "@/lib/units";

interface Props {
  layout: LayoutResult;
  units: Units;
  swatch: string;
  selected?: string | null;
  onSelect?: (pieceId: string | null) => void;
  showDims?: boolean;
  showSA?: boolean;
  compact?: boolean; // no toolbar (used inside guided steps / thumbnails)
  title: string;
  skin?: Skin;
}

/** Shaped pieces are drawn inside their bounding box; rotated ones are turned 90°. */
function shapeTransform(pl: Placement) {
  if (pl.rotated) return `translate(${pl.x + pl.w},${pl.y}) rotate(90)`;
  if (isUnfolded(pl)) return `translate(${pl.x + pl.w / 2},${pl.y})`;
  return `translate(${pl.x},${pl.y})`;
}
/** An "on fold" piece cut from single-layer fabric: its outline (a half) is mirrored around the centre. */
function isUnfolded(pl: Placement) {
  return !pl.onFold && pl.outline !== undefined && pl.isFoldPiece === true;
}

export default function LayoutView({ layout, units, swatch, selected, onSelect, showDims = true, showSA = true, compact, title, skin }: Props) {
  const [zoom, setZoom] = useState(1);
  const uid = useId().replace(/:/g, "");
  const pad = 8;
  const W = layout.usableWidth;
  const L = Math.max(layout.lengthUsed + 4, 20);
  const vbW = W + pad * 2 + 14;
  const vbH = L + pad * 2 + 6;
  const fs = Math.max(2.2, Math.min(3.6, W / 22));
  const tickStep = units === "imperial" ? 15.24 : 10; // 6″ or 10 cm

  const ticks: number[] = [];
  for (let t = 0; t <= W + 0.01; t += tickStep) ticks.push(t);
  const vticks: number[] = [];
  for (let t = 0; t <= L + 0.01; t += tickStep) vticks.push(t);

  const svg = (
    <svg
      viewBox={`${-pad - 4} ${-pad - 2} ${vbW} ${vbH}`}
      direction="ltr"
      role="img"
      aria-label={title}
      className="block h-auto"
      style={{ width: compact ? `min(100%, ${((55 * vbW) / vbH).toFixed(1)}vh)` :`min(${zoom * 100}%, ${((zoom * 62 * vbW) / vbH).toFixed(1)}vh)`, margin: "0 auto" }}
    >
      <defs>
        {skin && (
          <pattern id={`fs-${uid}`} width={skin.tileCm} height={skin.tileCm} patternUnits="userSpaceOnUse">
            <image href={skin.href} width={skin.tileCm} height={skin.tileCm} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
        <pattern id={`fw-${uid}`} width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill={mix(swatch, "#ffffff", 0.82)} />
          <rect width="1" height="1" fill={mix(swatch, "#ffffff", 0.74)} />
        </pattern>
        <marker id="grain-ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#2B2622" />
        </marker>
      </defs>
      {/* fabric */}
      <rect x={0} y={0} width={W} height={L} fill={`url(#fw-${uid})`} stroke={darken(swatch, 0.3)} strokeWidth={0.3} />
      {skin && <rect x={0} y={0} width={W} height={L} fill={`url(#fs-${uid})`} opacity={0.45} />}
      {/* rulers */}
      {ticks.map((t) => (
        <g key={`h${t}`}>
          <line x1={t} y1={-2.5} x2={t} y2={-0.5} stroke="#8b7f74" strokeWidth={0.2} />
          <text x={t} y={-3.4} fontSize={fs * 0.62} textAnchor="middle" fill="#8b7f74">{lenNum(t, units)}</text>
        </g>
      ))}
      {vticks.map((t) => (
        <g key={`v${t}`}>
          <line x1={W + 0.5} y1={t} x2={W + 2.5} y2={t} stroke="#8b7f74" strokeWidth={0.2} />
          <text x={W + 3.2} y={t + fs * 0.22} fontSize={fs * 0.62} fill="#8b7f74">{lenNum(t, units)}</text>
        </g>
      ))}
      {/* fold / selvedge edges */}
      {layout.mode === "folded" ? (
        <>
          <line x1={0} y1={0} x2={0} y2={L} stroke="#4A5744" strokeWidth={0.6} strokeDasharray="3 1 0.6 1" />
          <text transform={`translate(${-2.4},${L / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs * 0.75} fill="#4A5744" fontWeight={700}>FOLD</text>
          <text transform={`translate(${W + 7.5},${L / 2}) rotate(90)`} textAnchor="middle" fontSize={fs * 0.6} fill="#8b7f74" dy={-1}>selvedges</text>
        </>
      ) : (
        <>
          <text transform={`translate(${-2.4},${L / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs * 0.6} fill="#8b7f74">selvedge</text>
          <text transform={`translate(${W + 7.5},${L / 2}) rotate(90)`} textAnchor="middle" fontSize={fs * 0.6} fill="#8b7f74" dy={-1}>selvedge</text>
        </>
      )}
      {/* pieces */}
      {layout.placements.map((pl) => {
        const isSel = selected === pl.pieceId;
        const faded = selected && !isSel;
        const sa = pl.seamAllowance;
        const saL = pl.onFold ? 0 : sa;
        const grainVertical = !pl.rotated;
        const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
        const arrowLen = Math.min(grainVertical ? pl.h : pl.w, 30) * 0.55;
        const nameSize = Math.min(fs, pl.w / 7, pl.h / 4);
        const dimText = pl.onFold
          ? `${lenNum(pl.w, units)} × ${lenNum(pl.h, units)} on fold`
          : `${lenNum(pl.rotated ? pl.fullWidth : pl.w, units)} × ${lenNum(pl.rotated ? pl.fullHeight : pl.h, units)}`;
        return (
          <g
            key={`${pl.pieceId}-${pl.copy}`}
            role="button"
            tabIndex={onSelect ? 0 : -1}
            aria-label={`${pl.name}: ${dimText} ${unitSuffix(units)}, cuts ${pl.layers}`}
            onClick={() => onSelect?.(isSel ? null : pl.pieceId)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(isSel ? null : pl.pieceId); } }}
            style={{ cursor: onSelect ? "pointer" : undefined, opacity: faded ? 0.28 : 1, transition: "opacity .2s" }}
          >
            {pl.outline ? (
              <>
                <rect x={pl.x} y={pl.y} width={pl.w} height={pl.h} fill="none" stroke={darken(pl.color, 0.4)} strokeWidth={0.2} strokeDasharray="0.8 0.8" opacity={0.6} />
                <g transform={shapeTransform(pl)}>
                  <path d={pl.outline} fill={skin ? `url(#fs-${uid})` : mix(pl.color, "#ffffff", 0.35)} stroke={darken(pl.color, 0.4)} strokeWidth={isSel ? 0.9 : 0.45} vectorEffect="non-scaling-stroke" />
                  {skin && <path d={pl.outline} fill="#ffffff" opacity={0.3} />}
                </g>
                {isUnfolded(pl) && (
                  <g transform={`translate(${pl.x + pl.w / 2},${pl.y}) scale(-1,1)`}>
                    <path d={pl.outline} fill={skin ? `url(#fs-${uid})` : mix(pl.color, "#ffffff", 0.35)} stroke={darken(pl.color, 0.4)} strokeWidth={isSel ? 0.9 : 0.45} vectorEffect="non-scaling-stroke" />
                    {skin && <path d={pl.outline} fill="#ffffff" opacity={0.3} />}
                  </g>
                )}
              </>
            ) : (
              <>
                <rect x={pl.x} y={pl.y} width={pl.w} height={pl.h} fill={skin ? `url(#fs-${uid})` : mix(pl.color, "#ffffff", 0.35)} stroke={darken(pl.color, 0.4)} strokeWidth={isSel ? 0.9 : 0.45} />
                {skin && <rect x={pl.x} y={pl.y} width={pl.w} height={pl.h} fill="#ffffff" opacity={0.3} />}
              </>
            )}
            {showSA && sa > 0 && !pl.outline && (
              <rect x={pl.x + saL} y={pl.y + sa} width={pl.w - saL - sa} height={pl.h - 2 * sa} fill="none" stroke={darken(pl.color, 0.55)} strokeWidth={0.22} strokeDasharray="1.2 0.8" />
            )}
            {pl.onFold && <line x1={pl.x + 0.4} y1={pl.y} x2={pl.x + 0.4} y2={pl.y + pl.h} stroke="#4A5744" strokeWidth={0.9} />}
            {/* grainline */}
            <line
              x1={grainVertical ? cx : cx - arrowLen / 2} y1={grainVertical ? cy - arrowLen / 2 : cy}
              x2={grainVertical ? cx : cx + arrowLen / 2} y2={grainVertical ? cy + arrowLen / 2 : cy}
              stroke="#2B2622" strokeWidth={0.35} markerStart="url(#grain-ah)" markerEnd="url(#grain-ah)"
            />
            <text x={cx + (grainVertical ? 1.2 : 0)} y={pl.y + Math.max(nameSize * 1.4, pl.h * 0.18)} textAnchor="middle" fontSize={nameSize} fontWeight={700} fill="#2B2622">
              {pl.name}
            </text>
            {showDims && (
              <text x={cx} y={pl.y + pl.h - Math.max(1.2, pl.h * 0.08)} textAnchor="middle" fontSize={nameSize * 0.82} fill="#2B2622">
                {dimText}
              </text>
            )}
            <g transform={`translate(${pl.x + pl.w - 1}, ${pl.y + 1})`}>
              <rect x={-nameSize * 3.2} y={0} width={nameSize * 3.2} height={nameSize * 1.4} rx={nameSize * 0.4} fill={pl.layers === 2 ? "#2B2622" : "#C0583A"} />
              <text x={-nameSize * 1.6} y={nameSize * 1.02} textAnchor="middle" fontSize={nameSize * 0.8} fill="#fff" fontWeight={700}>
                {pl.onFold ? "cut 1" : `cut ${pl.layers}`}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );

  if (compact) return <div className="overflow-hidden rounded-xl bg-[var(--canvas)] p-2">{svg}</div>;

  return (
    <div className="rounded-2xl border border-line bg-[var(--canvas)]">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-sm">
        <span className="text-ink-soft">
          {layout.mode === "folded" ? "Folded selvedge to selvedge" : "Single layer"} · {lenNum(layout.fabricWidth, units)} {unitSuffix(units)} wide
        </span>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <button className="btn-icon" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} aria-label="Zoom out">−</button>
          <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button className="btn-icon" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label="Zoom in">+</button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto p-3">{svg}</div>
    </div>
  );
}
