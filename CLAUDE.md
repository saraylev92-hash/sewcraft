# SewCraft — notes for Claude Code

Guided sewing-project web app: **Discover → Prepare → Measure → Cut → Sew → Finish**.
Next.js 15 (App Router) · TypeScript · Tailwind v4 · static export (`out/`). No backend yet — user state is in `localStorage`.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000 (Turbopack)
npm run validate   # content rules over every guide — run after ANY content change; must say "All N projects pass."
npm run build      # static export to out/ (151 pages)
npx tsc --noEmit && npx eslint .
```

Don't run `next build` while `next dev` is running — they share `.next/`. Stop dev, `rm -rf .next`, then build.

## Where things live

- `content/projects/*.json` — editorial guides (one file = one project, no code changes needed). `content/community/*.json` — seeded community guides.
- `content/techniques.json`, `glossary.json`, `categories.json`, `tools.json` (tool catalog).
- `lib/types.ts` — content schema. `lib/normalize.ts` expands compact authoring (catalog tools `"iron"` / `"seam-ripper?"`, `"thread"` material, illustration templates, default expert/alt text).
- `lib/validate.ts` — the content rules (geometry at every param extreme, seam allowances, piece references across materials → cutting → steps, generated layouts fit, stage order, a visual + alt for every step, reviewer for published editorial).
- `lib/formula.ts` safe formula evaluator · `lib/resolve.ts` params → piece sizes/outlines · `lib/layout.ts` cutting-layout packer · `lib/needs.ts` fabric amounts.
- `lib/templates.ts` — 29 parametric step illustrations (`{ "type": "template", "name": "hem", "args": {...} }`).
- `components/scene/SceneView.tsx` (illustrations), `LayoutView.tsx` (cutting canvas), `PrintPattern.tsx` (1:1 tiled print: measurements, A4/Letter/A0, cover with assembly map; pieces packed onto shared pages by `lib/printLayout.ts`), `sew/SewMode.tsx` (guided mode), `community/GuideBuilder.tsx`.
- `lib/garments/` + `components/garments/` — garment patterns at `/patterns`, drafted client-side by FreeSewing (MIT; credits in `THIRD_PARTY_NOTICES.md` and on every pattern). `designs.ts` = which designs + measurement labels; `draft.ts` = draft, then re-draft with our print layout. Body measurements live in `state.body` (mm, `shoulderSlope` in degrees). FreeSewing's pattern labels stay English.
- `lib/store.ts` — all user state (profile, progress, prefs, stash, shopping, local community guides) behind a small `Repo` interface → the swap point for a future backend.
- `scripts/authoring/` — the Python helpers used to write the bundled JSON (examples only; see its README before running).

## Content rules that matter

- Dimensions are **formulas, never scaled**: pieces use project `params`/`constants` (`"W + D + 2*sa"`). Cut sizes INCLUDE seam allowance.
- Curved pieces: `outline` = SVG path (absolute M L C Q A Z) in cm with `{formula}` placeholders; vars `w`, `h`, `hw`; on-fold outlines are the half piece. Validator checks points stay in the box.
- Fabric quantities are derived from the cutting layout — never hard-code "0.8 m".
- Every sample pattern has `review.technicallyValidated: false` and the UI says "not yet test-sewn". Don't flip it without a real test sew.
- Community guides (`source: "community"`) need an `author` and are labelled "not editor-reviewed".
- AI-drafted text is fine as a draft; never present it as verified construction instructions.

## Gotchas

- Fonts are self-hosted in `app/fonts` via `next/font/local`. `next/font/google` + Turbopack broke every page (Google sometimes returns `/l/font?kit=` URLs) — don't switch back.
- `useStore(selector)` must return stable references (state slices or primitives), never new objects/arrays, or React loops.
- FreeSewing packages: pin all `@freesewing/*` to the same version, and list the plugins `core-plugins` imports explicitly in package.json (they are not declared as its dependencies).
- Static export: no server routes/APIs, no `next/image` optimisation; dynamic project routes use `generateStaticParams`. Local community guides render client-side under `/community/guide/?id=…`.

## Status / next ideas

Done: 36 guides, guided mode, cutting canvas, print, calculator, studio, community builder (local + export/import JSON), toasts & UX polish.
Not done: accounts & sync (Supabase via `Repo`), cross-user community sharing & moderation, AI assistant, CMS editor, real photos/videos, nesting curved pieces in layouts.
