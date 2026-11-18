// npx tsx --tsconfig scripts/tsconfig.preview.json scripts/preview-animations.tsx [templateName…] → out-preview/animations.html (+ .png with --png)
// Renders every registered animation's frames side by side, next to the static template, for review.
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SceneView from "../components/scene/SceneView";
import { ANIMATIONS } from "../lib/animations";
import { TEMPLATES } from "../lib/templates";

const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const tones = { main: "#C66B4E", lining: "#9BAE95", contrast: "#D9A35F", binding: "#4A6B8A", a: "#C66B4E", b: "#9BAE95" };
const cell = (title: string, el: React.ReactElement) =>
  `<div class="cell"><div class="cap">${title}</div>${renderToStaticMarkup(el)}</div>`;

let html = `<!doctype html><meta charset="utf-8"><style>
body{font:13px system-ui;background:#f6f1e8;margin:16px} .row{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.cell{width:300px;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden} .cap{padding:4px 8px;font-weight:600;min-height:34px}
h2{margin:6px 0} :root{--canvas:#FBF8F3}</style>`;
for (const [name, anim] of Object.entries(ANIMATIONS)) {
  if (names.length && !names.includes(name)) continue;
  const t = TEMPLATES[name];
  const args = Object.fromEntries((t?.args ?? []).filter((a) => a.default !== undefined).map((a) => [a.key, a.default]));
  const frames = anim(args);
  html += `<h2>${name}</h2><div class="row">`;
  frames.forEach((f, i) => { html += cell(`${i + 1}. ${f.caption}`, <SceneView scene={{ els: f.els }} tones={tones} vars={{}} units="metric" title="" />); });
  if (t) html += cell("static template (last frame should match)", <SceneView scene={{ els: t.build(args) }} tones={tones} vars={{}} units="metric" title="" />);
  html += `</div>`;
}
fs.mkdirSync("out-preview", { recursive: true });
fs.writeFileSync("out-preview/animations.html", html);
console.log("wrote out-preview/animations.html");
if (process.argv.includes("--png")) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { chromium } = require("playwright");
  (async () => {
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await p.goto(`file://${process.cwd()}/out-preview/animations.html`);
    await p.screenshot({ path: "out-preview/animations.png", fullPage: true });
    await b.close();
    console.log("wrote out-preview/animations.png");
  })();
}
