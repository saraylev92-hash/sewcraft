"use client";
// Deterministic renderer for instruction scenes. Every dimension label is computed from the
// project's formulas (so it follows custom sizes) — nothing is baked into an image.
import { useId } from "react";
import { useT } from "@/lib/i18n";
import { evaluate } from "@/lib/formula";
import { darken, mix, resolveTone } from "@/lib/color";
import { len } from "@/lib/units";
import type { Skin } from "@/lib/fabrics";
import type { Pt, Scene, SceneEl, Units } from "@/lib/types";

interface Props {
  scene: Scene;
  tones: Record<string, string>;
  vars: Record<string, number>;
  units: Units;
  title: string;
  className?: string;
  contrast?: boolean;
  legend?: boolean;
  skins?: Record<string, Skin>;
}

const INK = "#2B2622";
const THREAD = "#2F2A26";
const ACCENT = "#C0583A";

export default function SceneView({ scene, tones, vars, units, title, className, contrast, legend, skins }: Props) {
  const t = useT();
  const uid = useId().replace(/:/g, "");
  const sw = contrast ? 1.6 : 1;
  const usedTones = new Set<string>();
  let hasWrong = false;
  for (const el of scene.els) {
    if ((el.k === "panel" && !el.dim) || el.k === "poly" || el.k === "path") {
      usedTones.add(el.tone);
      if (el.side === "wrong") hasWrong = true;
    }
  }

  const fillFor = (tone: string, side?: "right" | "wrong") =>
    side === "wrong" ? `url(#w-${uid}-${tone.replace("#", "")})` : `url(#r-${uid}-${tone.replace("#", "")})`;

  const fmt = (el: Extract<SceneEl, { k: "dim" }>) => {
    let v: number;
    try { v = evaluate(el.value, vars); } catch { return "?"; }
    return el.unit === "mm" ? `${v} mm` : len(v, units);
  };

  const render = (el: SceneEl, i: number) => {
    switch (el.k) {
      case "panel": {
        const c = resolveTone(el.tone, tones);
        const n = el.notch ?? 0;
        const { x, y, w, h } = el;
        const d = n
          ? `M${x},${y} H${x + w} V${y + h - n} H${x + w - n} V${y + h} H${x + n} V${y + h - n} H${x} Z`
          : undefined;
        const common = { fill: fillFor(el.tone, el.side), stroke: darken(c, 0.45), strokeWidth: 1.4 * sw, opacity: el.dim ? 0.55 : 1 };
        return (
          <g key={i}>
            {d ? <path d={d} {...common} /> : <rect x={x} y={y} width={w} height={h} rx={el.rx ?? 1.5} {...common} />}
            {el.label && (
              <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" className="scene-label" fill={INK} fontSize={11}>
                {el.label}
              </text>
            )}
          </g>
        );
      }
      case "poly": {
        const c = resolveTone(el.tone, tones);
        return <polygon key={i} points={el.pts.map((p) => p.join(",")).join(" ")} fill={fillFor(el.tone, el.side)} stroke={darken(c, 0.45)} strokeWidth={1.4 * sw} strokeLinejoin="round" />;
      }
      case "path": {
        const c = resolveTone(el.tone, tones);
        return (
          <g key={i}>
            <path d={el.d} fill={fillFor(el.tone, el.side)} stroke={darken(c, 0.45)} strokeWidth={1.4 * sw} strokeLinejoin="round" />
            {el.label && <text x={el.lx ?? 200} y={el.ly ?? 150} textAnchor="middle" dominantBaseline="middle" className="scene-label" fill={INK} fontSize={11}>{el.label}</text>}
          </g>
        );
      }
      case "stitch": {
        const pts = el.pts.map((p) => p.join(",")).join(" ");
        const P = el.closed ? "polygon" : "polyline";
        return <P key={i} points={pts} fill="none" stroke={el.color ?? THREAD} strokeWidth={2 * sw} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" className="stitch-anim" />;
      }
      case "arrow": {
        const [x1, y1] = el.from, [x2, y2] = el.to;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
        const b = el.bend ?? 0;
        const cx = mx - (dy / L) * b, cy = my + (dx / L) * b;
        const col = el.color ?? ACCENT;
        const horizontal = Math.abs(dx) >= Math.abs(dy);
        return (
          <g key={i}>
            <path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke={col} strokeWidth={2.4 * sw} markerEnd={`url(#ah-${uid})`} strokeLinecap="round" />
            {el.label && (
              <text x={horizontal ? cx : cx + 8} y={horizontal ? cy - 8 : cy} textAnchor={horizontal ? "middle" : "start"} dominantBaseline={horizontal ? "auto" : "middle"} fill={col} fontSize={11} fontWeight={600}>{el.label}</text>
            )}
          </g>
        );
      }
      case "fold": {
        const [x1, y1] = el.from, [x2, y2] = el.to;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5E6B57" strokeWidth={1.6 * sw} strokeDasharray="10 3 2 3" />
            {el.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fill="#4A5744" fontSize={10.5} fontStyle="italic">{el.label}</text>}
          </g>
        );
      }
      case "dim": {
        const [x1, y1] = el.from, [x2, y2] = el.to;
        const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
        const o = el.offset ?? 0;
        const ax = horizontal ? 0 : o, ay = horizontal ? o : 0;
        const t = fmt(el);
        const tx = (x1 + x2) / 2 + ax, ty = (y1 + y2) / 2 + ay;
        const tw = t.length * 6.2 + 8;
        // keep the label pill inside the 400×300 canvas
        const bx = horizontal ? Math.min(398 - tw, Math.max(2, tx - tw / 2)) : tx + 4 + tw <= 398 ? tx + 4 : tx - 4 - tw;
        const by = horizontal ? (ty - 17 < 2 ? ty + 3 : ty - 17) : ty - 8;
        return (
          <g key={i} className="dim">
            <line x1={x1 + ax} y1={y1 + ay} x2={x2 + ax} y2={y2 + ay} stroke={ACCENT} strokeWidth={1.3 * sw} markerStart={`url(#tk-${uid})`} markerEnd={`url(#tk-${uid})`} />
            <rect x={bx} y={by} width={tw} height={15} rx={7} fill="#FFFBF5" stroke={ACCENT} strokeWidth={0.8} />
            <text x={bx + tw / 2} y={by + 11} textAnchor="middle" fill={ACCENT} fontSize={10.5} fontWeight={700}>{t}</text>
          </g>
        );
      }
      case "label":
        return <text key={i} x={el.x} y={el.y} textAnchor={el.anchor ?? "start"} fill={INK} fontSize={el.size ?? 12} fontWeight={el.bold ? 700 : 500}>{el.text}</text>;
      case "pin":
        return (
          <g key={i} transform={`translate(${el.x},${el.y}) rotate(${el.angle ?? 90})`}>
            <line x1={-14} y1={0} x2={10} y2={0} stroke="#8a8f96" strokeWidth={1.4} />
            <circle cx={-14} cy={0} r={3.6} fill={ACCENT} />
          </g>
        );
      case "clip":
        return <rect key={i} x={el.x - 5} y={el.y - 9} width={10} height={18} rx={3} fill="#E25D4B" stroke="#9c3426" strokeWidth={0.8} />;
      case "gap": {
        const [x1, y1] = el.from, [x2, y2] = el.to;
        return (
          <g key={i}>
            <path d={`M${x1},${y1 - 5} L${x1},${y1} L${x2},${y2} L${x2},${y2 - 5}`} fill="none" stroke={ACCENT} strokeWidth={2 * sw} />
            {el.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 14} textAnchor="middle" fill={ACCENT} fontSize={11} fontWeight={700}>{el.label}</text>}
          </g>
        );
      }
      case "focus":
        return <circle key={i} cx={el.x} cy={el.y} r={el.r} fill="none" stroke={ACCENT} strokeWidth={2.2 * sw} strokeDasharray="4 3" className="focus-pulse" />;
      case "iron":
        return (
          <g key={i} transform={`translate(${el.x - 34},${el.y - 18})`} aria-hidden>
            <path d="M4,30 C8,8 30,2 64,4 L68,30 Z" fill="#E9E4DC" stroke={INK} strokeWidth={1.4} />
            <path d="M22,4 C24,-8 50,-8 54,4" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
            <rect x={2} y={29} width={68} height={5} rx={2} fill="#9aa3ab" />
          </g>
        );
      case "foot":
        return (
          <g key={i} transform={`translate(${el.x},${el.y})`} aria-hidden>
            <rect x={-3} y={-56} width={6} height={36} fill="#8f969c" />
            <line x1={0} y1={-20} x2={0} y2={-2} stroke="#4b5257" strokeWidth={1.6} />
            <path d="M-18,-12 h36 v10 a4,4 0 0 1 -4,4 h-28 a4,4 0 0 1 -4,-4 z" fill="#B9C0C5" stroke="#4b5257" strokeWidth={1.2} opacity={0.9} />
          </g>
        );
      case "scissors":
        return (
          <g key={i} transform={`translate(${el.x},${el.y}) rotate(${el.angle ?? 0})`} aria-hidden>
            <circle cx={-14} cy={-6} r={6} fill="none" stroke={INK} strokeWidth={2} />
            <circle cx={-14} cy={8} r={6} fill="none" stroke={INK} strokeWidth={2} />
            <path d="M-8,-4 L22,4 M-8,6 L22,-2" stroke="#7d868c" strokeWidth={3} strokeLinecap="round" />
          </g>
        );
      case "zip": {
        const teeth = [];
        for (let t = el.x + 4; t < el.x + el.w - 4; t += 6) teeth.push(<rect key={t} x={t} y={el.y - 2} width={3} height={4} fill="#d5d9dc" />);
        const px = el.open ? el.x + el.w * 0.55 : el.x + el.w * 0.1;
        return (
          <g key={i}>
            <rect x={el.x} y={el.y - 6} width={el.w} height={12} fill="#2E3A40" rx={1} />
            {teeth}
            <rect x={px} y={el.y - 8} width={14} height={16} rx={3} fill="#a8b0b4" stroke="#4b5257" />
            <rect x={px + 4} y={el.y + 6} width={6} height={12} rx={2} fill="#a8b0b4" stroke="#4b5257" />
          </g>
        );
      }
      case "cord": {
        const c = resolveTone(el.color ?? "#E8E0D2", tones);
        return <path key={i} d={smooth(el.pts)} fill="none" stroke={c} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 1px 0 ${darken(c, 0.5)})` }} />;
      }
      case "elastic": {
        const lines = [];
        for (let t = el.x + 4; t < el.x + el.w; t += 5) lines.push(<line key={t} x1={t} y1={el.y + 2} x2={t} y2={el.y + 16} stroke="#d6cfc4" strokeWidth={1} />);
        return <g key={i}><rect x={el.x} y={el.y} width={el.w} height={18} fill="#FBF8F3" stroke="#a49a8c" strokeWidth={1} />{lines}</g>;
      }
      case "cutout":
        return (
          <g key={i}>
            <rect x={el.x} y={el.y} width={el.s} height={el.s} fill={`url(#x-${uid})`} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="4 3" />
          </g>
        );
    }
  };

  return (
    <figure className={className}>
      <svg viewBox="0 0 400 300" direction="ltr" role="img" aria-label={title} className="w-full h-auto block">
        <defs>
          <marker id={`ah-${uid}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
          </marker>
          <marker id={`tk-${uid}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <line x1="5" y1="0" x2="5" y2="10" stroke={ACCENT} strokeWidth="1.5" />
          </marker>
          <pattern id={`x-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#FFF6F2" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={ACCENT} strokeWidth="1.2" opacity="0.5" />
          </pattern>
          {Array.from(new Set(scene.els.flatMap((e) => (e.k === "panel" || e.k === "poly" || e.k === "path" ? [e.tone] : [])))).map((tone) => {
            const c = resolveTone(tone, tones);
            const id = tone.replace("#", "");
            const skin = skins?.[tone];
            if (skin) {
              const T = Math.round(skin.tileCm * 5); // 12 cm ≈ 60 scene units
              return (
                <g key={tone}>
                  <pattern id={`r-${uid}-${id}`} width={T} height={T} patternUnits="userSpaceOnUse">
                    <image href={skin.href} width={T} height={T} preserveAspectRatio="xMidYMid slice" />
                  </pattern>
                  <pattern id={`w-${uid}-${id}`} width={T} height={T} patternUnits="userSpaceOnUse">
                    <image href={skin.href} width={T} height={T} preserveAspectRatio="xMidYMid slice" />
                    <rect width={T} height={T} fill="#ffffff" opacity="0.6" />
                    <line x1="0" y1="0" x2={T} y2={T} stroke={mix(skin.avg, "#ffffff", 0.2)} strokeWidth="1" />
                    <line x1={T / 2} y1="0" x2={T * 1.5} y2={T} stroke={mix(skin.avg, "#ffffff", 0.2)} strokeWidth="1" />
                    <line x1={-T / 2} y1="0" x2={T / 2} y2={T} stroke={mix(skin.avg, "#ffffff", 0.2)} strokeWidth="1" />
                  </pattern>
                </g>
              );
            }
            return (
              <g key={tone}>
                <pattern id={`r-${uid}-${id}`} width="10" height="10" patternUnits="userSpaceOnUse">
                  <rect width="10" height="10" fill={c} />
                  <circle cx="2.5" cy="2.5" r="0.9" fill={mix(c, "#ffffff", 0.35)} />
                  <circle cx="7.5" cy="7.5" r="0.9" fill={mix(c, "#ffffff", 0.35)} />
                </pattern>
                <pattern id={`w-${uid}-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="7" fill={mix(c, "#ffffff", 0.62)} />
                  <line x1="0" y1="0" x2="0" y2="7" stroke={mix(c, "#ffffff", 0.35)} strokeWidth="1" />
                </pattern>
              </g>
            );
          })}
        </defs>
        <rect width="400" height="300" fill="var(--canvas)" />
        {scene.els.map(render)}
      </svg>
      {legend && (
        <figcaption className="mt-2 px-3 pb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {[...usedTones].filter((tn) => !tn.startsWith("#")).slice(0, 4).map((tn) => (
            <span key={tn} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-black/20" style={{ background: resolveTone(tn, tones) }} />{t("project.legend.rightSide")}</span>
          )).slice(0, 1)}
          {hasWrong && <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-black/20 hatch" />{t("project.legend.wrongSide")}</span>}
          {scene.els.some((e) => e.k === "stitch") && <span className="inline-flex items-center gap-1.5"><svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke={THREAD} strokeWidth="2" strokeDasharray="4 3" /></svg>{t("project.legend.stitchLine")}</span>}
          {scene.els.some((e) => e.k === "fold") && <span className="inline-flex items-center gap-1.5"><svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#5E6B57" strokeWidth="2" strokeDasharray="6 2 1 2" /></svg>{t("project.legend.fold")}</span>}
          {scene.els.some((e) => e.k === "cutout") && <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 border border-dashed" style={{ borderColor: ACCENT }} />{t("project.legend.cutAway")}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function smooth(pts: Pt[]): string {
  if (pts.length < 3) return `M${pts.map((p) => p.join(",")).join(" L")}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}
