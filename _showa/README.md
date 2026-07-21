# Showa Hi-Fi Counter — re-skin (work in progress)

A re-skin of the Wiim Dashboard into the **Showa Hi-Fi Counter** visual language:
walnut cabinet, cream faceplate, rust signal accent — Rams/Loewy hi-fi object
language fused with 1960s–80s jazz album-cover graphics.

This staging folder lives at the repo root (`/_showa/`). Files here mirror
their real paths under `src/` so the merge mapping is obvious. **Nothing in
your live app is modified until you copy these over** — every file under
`_showa/` is a separate copy, never an edit to the real file in place.

## Platform target: desktop-only, not responsive

This app is a **desktop-only, local-network application** — it runs on a
local machine and is accessed via a desktop browser. There is no mobile or
tablet use case to support. Going forward, design and layout decisions in
this re-skin should target fixed desktop sizing, not responsive breakpoints.

The codebase still has pre-existing `sm:`/responsive Tailwind variants (e.g.
`flex-col sm:flex-row` on `NowPlayingCard`, `text-5xl sm:text-6xl` on the
title) from before this was clarified — these are legacy overhead, not a
requirement to preserve. They're not actively being stripped out as their
own task, but don't treat them as something that needs to be kept working or
extended; new layout work shouldn't add new responsive hedging, and removing
the old variants entirely is a legitimate future cleanup if/when it comes up.

## Two permanent repo-config changes (not part of the copy/revert cycle)

Getting a file with sibling relative imports (`now-playing-card.tsx` →
`./vinyl-disc`, `./kiosk-view`, etc.) to live safely in a staging folder
required two small, permanent edits — both already applied, both meant to
stay:

- **`tsconfig.json`**: added `"_showa"` to `exclude`. TypeScript's `include`
  was `**/*.tsx` repo-wide with only `node_modules` excluded, so it tried to
  type-check `_showa/now-playing-card.tsx` in place — where `./vinyl-disc`
  doesn't exist (it only exists at the real destination path, next to its
  real siblings). This is what actually broke the build, twice — moving the
  folder relative to `src/` (round 3) was based on a wrong theory (confusing
  Tailwind's `content` glob scanning with TypeScript's compile scope) and
  didn't fix anything; excluding it from `tsconfig.json` does.
- **`.dockerignore`**: added `_showa`. Not required for correctness (the
  tsconfig fix alone resolves the build error) — just keeps the staging
  folder out of the Docker build context for smaller/faster builds as it grows.

Both are safe to leave permanently; they don't affect the real app, and they
don't need to be part of the `git checkout --` revert list for the six staged
files below (they're real, intentional repo changes, not a preview swap).

## What's here

| This file | Replaces | What it does |
|---|---|---|
| `app/globals.css` | `src/app/globals.css` | Palette → walnut/faceplate/rust HSL tokens; `.glass` → opaque, **inset** recessed-panel treatment. Adds a `.cabinet` helper. Font tokens intentionally not set here — see `layout.tsx`. |
| `app/layout.tsx` | `src/app/layout.tsx` | Loads **Antonio** (display), **IBM Plex Sans** (UI labels), **IBM Plex Mono** (numeric readouts) via `next/font/google` — self-hosted at build time, required by the CSP (`font-src 'self' data:`). Sets the `--font-display/--font-sans/--font-mono` variables. |
| `tailwind.config.ts` | `tailwind.config.ts` (repo root) | Adds `font-display` / `font-mono` families + Showa material colors. Radius driven via the token. Also adds the `marquee` keyframe + `animate-marquee` utility (see below). |
| `components/dashboard/quality-pill.tsx` | `src/components/dashboard/quality-pill.tsx` | "Lossless" tier hardcoded a cool slate-grey that clashed with the warm palette — swapped to faceplate-cream. "Hires" gold kept as-is (deliberate). The kbps/bit-depth/sample-rate label is now `font-mono` — it's a numeric readout, not UI prose. |
| `components/ui/card.tsx` | `src/components/ui/card.tsx` | `Card` hardcoded `rounded-3xl`, bypassing `--radius`. Switched to `rounded-lg`. |
| `components/ui/slider.tsx` | `src/components/ui/slider.tsx` | Added `seek` / `volume` variants (thin hairline track + small filled-dot thumb — rust for seek, cream for volume). The `default` variant is byte-for-byte the original, so the EQ card and any other slider are unaffected. |
| `components/ui/marquee-text.tsx` | *(new file)* `src/components/ui/marquee-text.tsx` | New component. Scrolling readout for the track title — an AVR-style display for titles too long for their window. Measures actual text width vs. container; renders static (truncated, no animation) when it fits, scrolls only on real overflow. Respects `prefers-reduced-motion`. Pauses on hover. Driven by the `marquee` keyframe in `tailwind.config.ts` via two CSS vars it sets per-instance (`--marquee-distance`, `--marquee-duration`). |
| `components/dashboard/now-playing-card.tsx` | `src/components/dashboard/now-playing-card.tsx` | See "Now-playing showpiece pass" below — this file has had the most work and deserves its own section rather than one table row. **Round 24**: new `activePresetName` prop — substitutes the last-tapped preset's name into the stream-info band in place of a generic "Network" label (internet radio has no station name anywhere in the WiiM API), but never overrides a real vendor-reported name (Plex, etc.). |
| `components/ui/service-logo.tsx` | *(first staged Round 24)* `src/components/ui/service-logo.tsx` | Not previously part of the re-skin's touched surface — staged here for the first time in Round 24 to add a `"vendor"` case to the Radio-icon fallback (Plex and other real DLNA/UPnP vendors now key off `"vendor"` rather than `"network"`; see `now-playing-info.ts` / SESSION_HANDOFF Round 24). |
| `components/dashboard/dashboard.tsx` | `src/components/dashboard/dashboard.tsx` | Page shell. Widened `max-w-5xl` (64rem) → arbitrary `max-w-[78rem]` per Greg's request. **Round 21**: source/output lifted out of the small-cards grid into `<SourceOutputPanel>` placed directly under the now-playing card (`!mt-[60px]`, before Presets/EQ). |
| `components/dashboard/keycap-button.tsx` | *(new file)* `src/components/dashboard/keycap-button.tsx` | **Round 21.** Source/output selector key built around a single flat `keycap.png` tile: icon+label above, cap, indicator lamp below. Active = `led-on.png` + icon/label rust (`--primary`); inactive = `led-off.png` + dim faceplate; busy = lamp lit + `animate-pulse`. Clicks visually silent. |
| `components/dashboard/source-output-panel.tsx` | *(new file)* `src/components/dashboard/source-output-panel.tsx` | **Round 21.** The merged Source+Output panel — one rectilinear `.glass` card, SOURCE row over OUTPUT row, full-bleed engraved seam (now-playing recipe). Folds the old `source-card`/`output-card` filter+select logic in; those two plus `option-grid.tsx` are now orphaned (left on disk). **Round 25** merged in a DEVICE column (device switcher, Add/Settings/Logout, device info). **Round 27**: the whole panel is now a collapsible accordion, closed by default, first row inside the `Card` is a `.control-tile` trigger (`Source \| Output \| Device` + chevron); content wrapped in a CSS `grid-template-rows` accordion (no new dependency). |
| `components/dashboard/preset-card.tsx` | `src/components/dashboard/preset-card.tsx` | **Round 22–23.** Presets panel. Round 23 rebuilt it into independent recessed walnut cubbies on a uniform `grid-cols-6` — warm-monotone non-active tiles, full-colour active tile with rust lacquer frame + protruding bar tab, brass blank-slot tiles with tight thick-ring numerals. Client-side tap memory for active state (`activeIndex`, cleared on source change / stop). `presetsPanelGrain`/`presetsPanelGrain2` face texture. |
| `components/dashboard/eq-card.tsx` | *(first staged Round 28)* `src/components/dashboard/eq-card.tsx` | **Round 28.** Equalizer panel — shared chrome + Graphic EQ view re-skinned; Parametric EQ view deliberately left as the original default-styled table (next round). One `.glass` panel (`eqPanelGrain`/`eqPanelGrain2` face texture) with an EQUALIZER wordmark, tan-tile source + Graphic/Parametric sub-tabs (CSS `Led` dot, no bold on active — LED alone carries state), a POWER knob (`power-btn.png` / `power-off-overlay.png`) that replaces the old enable `Switch`, a 10-fader graphic bank (`EqSlider` wrapping Radix's vertical slider — 10px recessed groove, tick hairlines in `hsl(26deg 12% 58% / 31%)`, `eq-knob.png` cap thumb with a hard directional `drop-shadow(6px 7px 8px rgba(0,0,0,1))` per Greg's exact spec), and a footer with the Presets dropdown plus rename/delete/save grouped immediately beside it (not spread to the panel's far edge). Confirmed live "good" after two tuning passes. **Round 29** re-skins the Parametric EQ view: 10 rows (bands a–j), each = band letter, tan-tile `TypeDropdown`, recessed `FreqInput` readout, then a `PeqAxis` (horizontal `PeqSlider` + numeric readout + below-track tick marks) for Q, then Gain — reusing the scaled-down `eq-knob.png` cap, no new assets. |
| *(not staged here)* `public/play-button.png` | `public/play-button.png` | The real play/pause dome button asset (transparent corners), supplied by Greg. Binary — lives directly in `public/`, not swapped through `_showa/`. Consumed by `now-playing-card.tsx`'s transport row. |

## Now-playing showpiece pass (current focus)

This is the active work — the remaining panels (presets, EQ, sub-out) haven't
been touched yet structurally, only token-level. (Source/output was rebuilt in
Round 21 — see the file table above.)

**Done, confirmed working in a real screenshot:**
- **Fonts actually applied** (not just loaded): track title → `font-display`
  (Antonio); seek timestamps, volume %, codec label, quality pill →
  `font-mono`; artist/album left on `font-sans` (UI label register), but see
  next point.
- **Title treatment overhauled to match the Lovart mockup**, after pixel-
  measuring the mockup against a same-scale screenshot of the live card (used
  album-art width as the common reference object across both images, since
  their raw export resolutions differ). Findings: title cap-height ≈ 5.1–5.5×
  the artist/album line height — not the modest ~1.6× first shipped. Fixed:
  - Title is now `text-5xl`/`text-6xl` (responsive), **all-caps** (applied in
    JS via `.toUpperCase()`, not CSS `text-transform`, so the string
    `MarqueeText` measures for overflow matches what's rendered), bold,
    tight tracking/leading.
  - Title wrapped in the new `MarqueeText` component instead of a plain
    truncated `<h2>` — long titles scroll like a hi-fi readout instead of
    clipping or wrapping and blowing out the card height. This was the
    user's own suggestion when asked how overflow should behave.
  - Artist line: bold, **uppercase**, tracked (was plain `text-sm` body text)
    — matches "E.VAX" styling in the mockup, which is a deliberate label
    treatment, not a smaller version of the title.
  - Album line: switched to `font-mono` — matches the more technical,
    placard-like look of the mockup's album text versus prose.
- **Engraved seam added** between the metadata block (title/artist/album/
  progress) and the transport row, matching a feature of the mockup that
  was completely missing before. Pixel-sampled the mockup's seam directly
  (RGB ~(3,3,5) groove vs. ~(29,28,26) panel background — i.e. *darker* than
  the panel, not a lighter dividing rule) and built it the same way `.glass`'s
  recess shading works in `globals.css` (dark inset shade + a thin opposite-
  side highlight) rather than reaching for the existing `--border` token,
  which resolves lighter than the panel (~RGB 46,42,36) and would have read
  as a seam catching light rather than one cut into it. Renders
  unconditionally (even for physical-input sources with no progress bar
  above it) — it's a constant structural zone divider by design, confirmed
  with the user rather than assumed.

- **Transport row rebuilt with the real button asset** (most recent session,
  "Round 8" in the changelog). After four rounds of CSS gradient attempts
  (radial + conic bezel rings + satin mottle) couldn't match the fidelity of
  the mockup's play/pause dome, Greg supplied the actual rendered button as a
  transparent-corner PNG. It lives at `public/play-button.png` and is wired
  into `now-playing-card.tsx` as a plain `<img>`. **This supersedes the
  "matte domed cylinders built in CSS per the Sensory Supplement" plan** — the
  asset is the source of truth now, not a CSS recipe. Prev/next/shuffle/repeat
  became bare-glyph icons with no button chrome.
  - **Docker asset gotcha learned here:** the app runs a fully baked image
    with no source volume mounts, so a NEW static asset (the PNG) only appears
    after `docker compose up -d --build` — a plain restart serves the old
    baked image and the asset 404s. (Also why every preview needs `--build`,
    not just `up`.)
- **Album-art colour wash removed entirely** from the now-playing card — the
  `extractColor`-driven radial-gradient that crossfaded on track change. It
  worked as designed; Greg wanted it gone regardless of album colour. (This
  reverses the token-handoff's "don't reinvent this, it's the right system"
  note — the system was fine, just unwanted.)
- **Transport + volume merged into one horizontal row**: shuffle → prev →
  play → next → repeat → volume icon → slider → readout, with the slider as
  the sole `flex-1 min-w-0` element so it absorbs the free space.
- **Page shell widened** `max-w-5xl` (64rem) → `max-w-[78rem]` via the staged
  `dashboard.tsx` (78rem has no named Tailwind step, hence the arbitrary
  value). Verified in sync between `_showa/` and `src/`.
- **Spacing rhythm pass** — pixel-measured against the mockup using the play
  button's own diameter as a scale-independent reference unit (mockup button
  ≈105px; live button `72px`). The mockup is deliberately NOT uniformly
  spaced — a three-tier rhythm: tight text-stack gaps (~0.4–0.5× button
  diameter), a roomy gap before the control row (≈1.05×), a moderate gap
  before the footer zone. Applied: title→artist and album→slider tightened;
  **seam→transport row `mt-[76px]`** (the big deliberate gap); a **second
  engraved seam above the stream-info line** (`mt-9` gap) so stream-info reads
  as its own third structural zone instead of floating in padding. Honest
  caveat: these px values come from one mockup at one render scale mapped onto
  the live button size — re-check against a real screenshot if they look off.
- **`StreamInfoLine` refactored**: left-aligned (dropped `justify-center`/
  `text-center`), `text-xs`→`text-sm` with a `font-semibold` service name,
  logo `size-4`→`size-6`, and **HI-RES LOSSLESS switched from a gold gradient
  to rust** (`hsl(var(--primary))`) with the gem icon now outline-style
  (`strokeWidth 1.5`) instead of filled amber.

**Confirmed NOT a bug, for the record:** an early screenshot showed the title
mid-scroll with its first two letters already gone (read "NKIER THAN A
MOSQUITO'S..." instead of "FUNKIER..."). This is just what a screenshot of a
moving marquee looks like mid-animation — there is no clipping/state bug, the
user confirmed it was caught mid-scroll. Don't re-investigate this if it comes
up again from a future screenshot; only chase it if text is missing while the
marquee is provably idle/static.

**Open thread, explicitly deferred (do NOT just go fix this):** the user
wants the palette retuned — faceplate/text toward `#B19D8B` (warmer/dimmer
than the locked `#E8E1D3`) and the rust accent toward `#C64C1A` (vs. locked
`#B3441E`). They were explicit that this is a *future*, dedicated pass —
not something to fold into the current showpiece work. It's logged in
Claude's persistent memory too, but repeating it here in case this session's
handoff is the only thing actually read. When it happens: it's a `globals.css`
HSL-token edit (`--faceplate`, `--rust`), not a per-component fix — every
card re-themes from those two tokens.

**Not yet started on this card:** the niche/cubby treatment (album art is
still a plain rounded square, not seated in the recessed-walnut cubby photo
background) — this is now the single biggest remaining structural piece on the
card. Also: brass/LED treatments and the procedural wood-grain texture on any
panel. (Transport button material is now DONE via the supplied PNG — see the
transport bullet above.)

## Preview it live (reversible)

```powershell
copy _showa\app\globals.css                              src\app\globals.css
copy _showa\app\layout.tsx                                src\app\layout.tsx
copy _showa\tailwind.config.ts                            tailwind.config.ts
copy _showa\components\dashboard\quality-pill.tsx         src\components\dashboard\quality-pill.tsx
copy _showa\components\ui\card.tsx                        src\components\ui\card.tsx
copy _showa\components\ui\slider.tsx                      src\components\ui\slider.tsx
copy _showa\components\ui\marquee-text.tsx                src\components\ui\marquee-text.tsx
copy _showa\components\dashboard\now-playing-card.tsx     src\components\dashboard\now-playing-card.tsx
copy _showa\components\dashboard\dashboard.tsx            src\components\dashboard\dashboard.tsx

# play-button.png is a binary asset already at public\play-button.png (NOT
# staged under _showa/ — it's not a swap-in text file). Required by
# now-playing-card.tsx's transport row. A NEW static asset is only picked up
# by a --build, never a plain restart (the Docker image is fully baked, no
# source volume mounts).
docker compose up -d --build
# open http://localhost:39446
```

When done reviewing the *visual* changes (leaves the tsconfig/.dockerignore
fixes in place, since those should stay permanently):

```powershell
docker compose down
git checkout -- src\app\globals.css src\app\layout.tsx tailwind.config.ts src\components\dashboard\quality-pill.tsx src\components\ui\card.tsx src\components\dashboard\now-playing-card.tsx src\components\dashboard\dashboard.tsx src\components\ui\slider.tsx
del src\components\ui\marquee-text.tsx
# del public\play-button.png   # optional — only if fully reverting the transport asset
```

> **As of this session, the live convention changed.** Earlier rounds always
> edited `_showa/` first and waited for an explicit copy step. This session's
> font/title/marquee/seam edits were written to **both** `_showa/` and the
> real `src/` paths directly, in the same turns, specifically because a
> missed manual copy step earlier in the session caused a "the fonts didn't
> load" false alarm that cost a full round-trip to diagnose. Going forward:
> assume `_showa/` and `src/` are in sync unless a message says otherwise —
> but if you ever see staged and real diverge, the copy commands above are
> still the way to reconcile them. Don't assume a copy step is needed by
> default; check first.

## Changelog

**Round 1 (first screenshot review):**
- Fixed `.glass` translucency (alpha background → opaque).
- Fixed quality-pill "lossless" slate-grey → faceplate-cream.
- Fixed Card's hardcoded `rounded-3xl` → token-driven `rounded-lg`.

**Round 2 (second screenshot review — "floating, not inset; distracting
corner gradient"):**
- Rewrote `.glass`'s box-shadow from an outward elevation cue to genuine
  inset shading (no outward shadow at all).
- Removed the hardcoded violet tint radial-gradient from `now-playing-card.tsx`.
- Fixed a second slate-grey instance in the same file (`StreamInfoLine`).

**Round 3 (first build failure — wrong fix):**
- Moved the staging folder from `src/_showa/` to repo-root `/_showa/`, on the
  theory that Next's build only scans `src/`. **This didn't fix anything** —
  the build failed again, identically, because the real cause was
  `tsconfig.json`'s repo-wide `**/*.tsx` include, not the folder's location
  relative to `src/`.

**Round 4 (second build failure — real fix):**
- Added `"_showa"` to `tsconfig.json`'s `exclude` — this is what actually
  stops TypeScript from trying to type-check files in the staging folder
  in place (where their relative sibling imports can't resolve).
- Added `_showa` to `.dockerignore` as a build-context size optimization
  (not required for correctness).

**Round 5 (fonts "didn't load" — process bug, not a code bug):**
- Applied `font-display`/`font-mono` classes to the title, timestamps,
  volume readout, codec label, and quality pill in `now-playing-card.tsx` /
  `quality-pill.tsx`. First screenshot after this showed no visible change —
  turned out the edits had only ever been written to `_showa/`, and the
  "copy + rebuild" step had been read as "just rebuild," so Docker faithfully
  rebuilt the *old* real files. No code defect; fixed by writing the same
  edits directly to the real `src/` paths and rebuilding again. This is the
  incident that motivated keeping `_showa/` and `src/` in sync turn-by-turn
  for the rest of the session rather than batching a copy step at the end.

**Round 6 (title scale didn't match the Lovart mockup):**
- User flagged the title looked too small/plain versus their mockup
  screenshot. Pixel-measured both images (mockup title cap-height vs. its own
  artist/album line height, then cross-checked against a same-scale live
  screenshot using album-art width as the common reference) rather than
  eyeballing a new size. Result: title jumped from `text-2xl` to
  `text-5xl`/`text-6xl`, gained `uppercase` + bold + tight tracking.
- Added the new `MarqueeText` component + `marquee` Tailwind keyframe so long
  titles scroll instead of overflowing at the new, much larger scale — the
  user's own suggestion, not something assumed. Keyframe holds at 0% for the
  first 12% of each loop (a real per-loop pause baked into the keyframe
  percentages, since `animation-delay` only fires before the *first*
  iteration of an `infinite` animation, not before every loop).
- Artist line restyled bold-uppercase-tracked, album line switched to
  `font-mono`, matching the mockup's "E.VAX" / "Just Like Fire" treatment —
  done after explicit confirmation, since the original ask was title-only and
  this expanded scope to two more elements.
- A heart/Last.fm-love icon was nearly relocated to accommodate the bigger
  title — turned out the icon wasn't even rendering in the user's session
  (`canLove` falsy), so there was nothing to relocate. Left untouched. If a
  future session sees the same heart-button code and is tempted to "fix its
  position," check whether it's actually visible on screen first.

**Round 7 (missing seam between metadata and transport rows):**
- Mockup has a visible engraved hairline between the title/artist/progress
  block and the transport-button row; the live build had open space instead.
  Pixel-sampled the mockup's seam directly rather than guessing a color —
  it's *darker* than the panel (≈RGB 3,3,5 vs. panel ≈29,28,26), so the
  existing `--border` token (resolves to ≈46,42,36, lighter than the panel)
  would have been the wrong choice. Built as a two-part dark-groove +
  faint-highlight line, matching `.glass`'s existing recess-shading recipe
  in `globals.css` rather than introducing a third shadow technique.
- Confirmed with the user that the seam should render unconditionally
  (including for physical-input sources with no progress bar above it)
  rather than guessing.

**Round 8 (transport material + layout/spacing — most recent session):**
- Transport buttons: four CSS-gradient rounds (radial, conic bezel rings,
  satin mottle) couldn't match the mockup's play/pause dome; Greg supplied the
  real button as a transparent-corner PNG → `public/play-button.png`, wired in
  as a plain `<img>`. Prev/next/shuffle/repeat became bare-glyph icons.
  Learned: new static assets need `docker compose up -d --build` (baked image,
  no volume mounts) — a plain restart 404s them.
- Removed the `extractColor` album-art colour wash from the now-playing card
  entirely (worked as designed, unwanted).
- Merged transport + volume into one horizontal row (shuffle/prev/play/next/
  repeat/volume/slider/readout; slider is the only `flex-1 min-w-0`).
- Widened the page shell `max-w-5xl` → `max-w-[78rem]` (staged `dashboard.tsx`).
- Spacing rhythm pass measured against the mockup with the play button's
  diameter as a scale-independent unit: tight text-stack gaps, `mt-[76px]`
  before the transport row, a second engraved seam (`mt-9` gap) above the
  stream-info line so it becomes its own structural zone.
- `StreamInfoLine`: left-aligned, `text-sm`, `font-semibold` service name,
  logo `size-6`, HI-RES LOSSLESS gold gradient → rust, gem icon outline-style.
- Recorded the standing desktop-only / no-responsive fact (see top of this
  README).

**Round 9 (scrubber/volume material + top-row cleanup + stream-info band):**
- Removed the source pill + bitrate `QualityPill` from above the title (the
  mockup keeps the card top clean — just the moon/sleep control, top-right).
  Relocated the bitrate readout into the stream-info band as a faceplate-cream
  inset chip beside the tier tag; `QualityPill` gained a `tone="readout"`
  variant for this (tier-agnostic cream, squared, subtle inset).
- Scrubber + volume restyled to the mockup via two new `Slider` variants:
  `seek` (thin hairline track, rust fill, small rust dot thumb) and `volume`
  (thin cream track, small cream dot). The `default` variant is untouched, so
  the EQ card and anything else using `Slider` keep the old chunky white knob.
- Volume dropped the `StepperSlider` −/+ buttons — desktop-only app, the
  touch-steppers were pure overhead. Now a plain `Slider variant="volume"`
  (the `StepperSlider` import was removed from the card).
- Stream-info promoted to its own recessed full-bleed band at the foot of the
  card (`-mx-4 -mb-4` to cancel the Card padding + darker wash + inset
  top-shadow), so it reads as a separate sunken footer instead of a
  seam-divided line sharing the panel surface.
- Centered the metadata↔transport seam in its gap (was asymmetric `mt-3` above
  / `mt-[76px]` below → `mt-[44px]` / `mt-[44px]`). Transport position is
  unchanged; only the seam moved to the middle of the gap.
- New staged file this round: `components/ui/slider.tsx`.

**Round 10 (cabinet woodgrain + panel texture wired into the app):**
- Cabinet woodgrain finally applied (the long-standing deferred item): a fixed,
  full-viewport inline `<svg>` in `layout.tsx` behind all content (`-z-10`),
  soft-light @ 0.72 over the walnut body gradient. Locked params:
  `feTurbulence baseFrequency="0.006 0.25" numOctaves=5 seed=3`, noise → alpha.
  Inline SVG (not a data-URI background) to stay clear of the CSP img-src
  directive — same rationale as self-hosting the fonts.
- Panel face texture added to the now-playing card: inline `<svg>` (id
  `panelGrain`) filling the Card behind the z-10 content. `fractalNoise 0.022 /
  2 octaves`, desaturated then contrast-stretched (`feComponentTransfer` slope
  2.6, so the tight grain reads at low opacity), soft-light @ 0.13 — a faint
  lighter grain lifting the near-black face.
- Both values were dialed in the standalone texture lab (card-on-walnut
  preview) before committing.
- Walnut breathing room: dashboard `<main>` padding `py-5` → `py-20` (80px
  top/bottom). Side walnut is still governed by the centered `max-w-[78rem]`;
  `px-4` left unchanged so card width is unaffected. (More side walnut → reduce
  the max-width rather than adding px, which would narrow cards.)

**Round 11 (panel texture layer 2 — finer grain stacked on layer 1):**
- Dialed in via the standalone texture lab (`card-on-walnut.html`), which had
  grown to three control rows: locked cabinet woodgrain, locked panel layer 1,
  and a new panel-layer-2 row with an on/off toggle for direct A/B against
  layer 1 alone. Confirmed the lab's baked-in defaults as final.
- Added a second inline `<svg>` (`panelGrain2`) to `now-playing-card.tsx`,
  stacked immediately after the existing `panelGrain` layer, same desaturate +
  contrast-stretch recipe. Locked: `fractalNoise 0.45 / 2 octaves` (much
  tighter than layer 1's `0.022`), soft-light @ `0.10`. Adds a fine micro-tooth
  on top of layer 1's broader-scale variation rather than replacing it.
- Follow-up tweak: layer 1's opacity nudged down from `0.13` to `0.07` after
  seeing both layers live together (layer 2 unchanged at `0.10`).
- Edited and verified in sync across `_showa/` and `src/` directly (dry-run
  diff confirmed identical before applying to each); structural balance
  re-checked (brace/paren/bracket counts, both filter IDs present exactly
  once) before the next Docker rebuild.

**Round 12 (panel edges: recessed → raised bevel, shared `.glass`):**
- Flipped `.glass` from the inset-recess treatment to a raised bevel, so every
  card now reads as a panel sitting proud of the walnut rather than cut into
  it. Shared style — applies to all cards at once (confirmed scope with Greg).
- Translated directly from Greg's Photoshop layer styles (full-card + top-left
  corner close-up provided): Inner Bevel up, size 7px / soften 2px, 61° angle /
  37° altitude; highlight Screen white @ 19%; shadow Multiply black @ 72%,
  half-round contour; plus a black 5px outer stroke @ 60% for the small
  inset-reveal illusion. CSS: graded inset highlight on the top edge + two
  inset black stops on the bottom interior (tight + softer, approximating the
  half-round falloff over the 7px bevel) + a 0-blur 5px box-shadow ring for the
  stroke. No outward drop shadow — the PSD spec doesn't include one.
- Note on intent vs. spec: Greg initially described a "raised look with a drop
  shadow," but the supplied PSD values are bevel + stroke with no drop shadow;
  built faithfully to the numbers. If it reads too flat, adding an outward
  elevation shadow is the next lever.
- `box-shadow` ring renders outside the border box and is NOT clipped by the
  now-playing card's `overflow-hidden` (that clips children only), so the 5px
  stroke shows correctly; the panel-texture SVGs stay clipped inside as before.
- Edited in sync across `_showa/` and `src/` (`src/` confirmed matching the
  staged original before editing; identical edit applied to both).

**Round 13 (scrubber + volume: flat-top beveled caps + recessed grooves):**
- Reworked the `seek`/`volume` slider variants from flat filled dots on a flat
  hairline to dimensional hardware: flat-top cylindrical CAPS with a beveled
  rim, sitting on a recessed groove. Per Greg's read of the mockup — not domes,
  flat faces with chamfered edges. Each keeps its own colour (volume cream,
  seek rust); volume is `size-4`, seek `size-3.5`.
- Thumb construction (inline `style`, since the gradient + multi-stop shadow
  stack don't express cleanly as Tailwind classes): a near-vertical face
  gradient (lightest at top so the flat face catches even light) + a tight
  ≈1px inset highlight/shade pair for the chamfer ring + an outward contact
  shadow so the cap sits on the groove. The thumb is a sibling of the
  overflow-hidden Track, so its outward shadow isn't clipped.
- Track: flat hairline → recessed groove (`--static`/0.9 fill + inset dark
  upper-lip shadow + faint lower-lip light catch), so the line reads cut into
  the panel. Fill/range colours + which-part-fills behaviour unchanged.
- `default` variant left byte-for-byte intact (EQ card + any other slider
  depend on it). Edited in sync across `_showa/` and `src/` (`src/` confirmed
  matching the staged original first).

**Round 14 (cubby rebuild — album art moved into its own recessed wood box):**
- The big deferred structural piece. Album art moved OUT of the `.glass`
  control panel into its own recessed cubby, a SEPARATE object on the cabinet
  (the panel is raised/proud; the cubby is inset in the wood — visually
  distinct, per Greg). Cubby (left) + panel (right) are now ~50/50 flex
  siblings, `items-start` so the cubby can run taller than the panel.
- New `CubbyArt` sub-component in `now-playing-card.tsx`: three stacked layers,
  back-to-front — (1) `cubby-with-records-plain.png` (the box + leaning stack),
  (2) the live content standing inside it, (3) `now-playing-stand.png` (the NOW
  PLAYING nameplate, in front across the bottom). Two new binary assets in
  `public/` (placed by Greg, confirmed via `dir`): `cubby-with-records-plain.png`
  (900x584) and `now-playing-stand.png` (777x115).
- The cover/vinyl/lyrics toggle SWAPS what stands in the cubby box (per Greg):
  cover = live square album art standing dead-straight (measured 0.06deg off
  vertical in the composite mockup — NO lean transform, just a cast shadow
  down-left via `drop-shadow`), vinyl = the existing `VinylDisc` (sized via a
  new `sizeClass="h-[88%] aspect-square"`), lyrics = the existing `LyricsView`.
  Toggle buttons + fullscreen stay BELOW the cubby as before.
- Asset measurements (PIL, against the composite mockup): hero record fills
  ~56% of cubby width / ~88% height, seated back-left; record content layer
  positioned in the right 64% of the box, floor-seated (`items-end pb-[7%]`).
  Record.png was reference-only (near-square, baked subtle shadow) — not
  shipped; the live art is a clean 1:1 square and the component adds lean
  (none, per measurement) + shadow.
- Physical-input/no-art fallback (source icon) carried into the cover layer.
  `extractColor` onLoad hook preserved (still feeds VinylDisc/KioskView).
  `dashboard.tsx` unchanged — the side-by-side split lives inside
  `NowPlayingCard`'s own returned fragment, so the cubby is a sibling of the
  `<Card>`, not nested inside it.
- Built in the sandbox (Python AST-style transform + tag-stack balance check),
  verified byte-identical across `src/` and `_showa/` after writing. NOTE: the
  panel is now a narrower column, so title scale + seam rhythm will likely need
  re-tuning from a screenshot (flagged, not pre-adjusted).

**Round 15 (cubby polish: stand width, toggle housing, panel border):**
- Stand was overhanging the cubby's interior box walls (the PNG rendered at
  `w-full` but the recessed cavity is only ~80% of the outer frame). Inset the
  stand to `w-[80%]` centred (`left-1/2 -translate-x-1/2`) so it sits within
  the box. (~80% from measuring the rendered screenshot; nudge if needed.)
- Toggle cluster (cover/vinyl/lyrics/fullscreen) below the cubby now housed in
  the same raised `.glass` panel as the main control panel (per Greg) — was
  bare `bg-white/8` rounded-full pill floating on the walnut; now
  `glass ... p-1.5`, rectilinear, so it reads as a deliberate control object.
- Fixed the pale-grey hairline around `.glass` panels: the `border` used the
  `--border` token (36 12% 16%), which resolves LIGHTER than the panel face
  (`--static`, 36 10% 10%), so it read as a lit grey line. Swapped to
  `1px solid hsl(0 0% 0% / 0.5)` — a true-black crisp edge. The 5px black ring
  still does the panel/walnut separation. Affects ALL `.glass` panels.
- All three edits in sync across `src/` and `_showa/` (verified byte-identical
  after writing; tag-stack balance re-checked on the card).

**Round 16 (stand sized relative to the ART, not the cubby):**
- Greg clarified: the stand's size + position should be relative to the album
  ART (the record extends past the stand on both sides), not the cubby box.
  Restructured Layer 2/3: the art now lives in a `relative h-[88%] aspect-square`
  CONTENT box, and the stand is a CHILD of that box — so `w-[73%]` is 73% of the
  ART width, centred. (Mockup, Greg's PS file: record 1006px wide, stand inset
  135px each side => 736px = ~73% of the record, centred.)
- Stand vertical: `absolute bottom-0 ... translate-y-[30%]` so it straddles the
  art's lower edge (sits in front, record stands behind it). `z-10` to stay
  above the art. The art box is floor-seated (`pb-[7%]`) so the stand lands in
  the floor zone. (translate-y-[30%] is an eyeball start; nudge from screenshot.)
- All three views (cover/vinyl/lyrics) now share the same art-sized content box;
  vinyl uses `sizeClass="size-full"` + a `grid place-items-center` wrapper,
  lyrics fills `absolute inset-0`. Each gets the stand in front.
- Synced + verified byte-identical across `src/` and `_showa/`; tag-stack
  balance re-checked after the nesting change.

**Round 17 (cubby art seated on the floor; stand widened; panel bevel/stroke spec):**
- Greg's exact PSD-style numbers, applied directly (not eyeballed):
  - Art content box: `h-[88%]`→`h-[93%]`, and the wrapper's `pb-[7%]`→`pb-[4%]`.
    The art was floating above the cubby floor; taller + less bottom padding
    seats it ON the floor.
  - Stand: `w-[73%]`→`w-[80%]` of the art (still child of the art box from
    Round 16, still centred + `translate-y-[30%]`).
  - `.glass` box-shadow replaced wholesale with Greg's exact spec: bevel
    highlight `inset 0 5px 5px -6px hsl(0 0% 100% / 0.45)` (brighter top edge
    than the prior 19%), the two black bevel-shade stops unchanged, and the
    outer stroke swapped from a thick 5px/60% ring to a hairline
    `0 0 0 1px hsl(0 0% 0% / 0.6)`. Visually: crisper edge, brighter bevel,
    much thinner frame around every `.glass` panel (toggle cluster + main
    control panel both affected).
- All four edits applied identically to `src/` and `_showa/`; stale in-comment
  references to the old 88%/73% values cleaned up to match; verified
  byte-identical across both trees after writing (`now-playing-card.tsx` +
  `globals.css`); tag-stack balance re-checked.

**Round 18 (toggle panel spacing + centring; stream-info row sized to fit):**
- Toggle cluster: padding `p-1.5`→`p-3` (0.75rem), gap `gap-1`→`gap-4` (1rem).
  Centring fix: wrapped the `.glass` row in a `flex w-[64%] justify-center`
  region that mirrors CubbyArt's content wrapper (same width/right-alignment
  as the art+stand), so the toggle row centres under the STAND/art rather than
  the full cubby — the cubby's left-side record stack was throwing off a
  naive full-cubby centre.
- StreamInfoLine + QualityPill (the Spotify/FLAC/HI-RES/bitrate row): all
  weights dropped from semibold/bold/medium to `font-normal`; row text
  `text-sm`→`text-xs`, icons `size-4/size-6`→`size-3.5/size-5`, gaps tightened
  (`gap-1.5`→`gap-1`, row `gap-x-3 gap-y-1.5`→`gap-x-2 gap-y-1`), the readout
  pill `text-xs`→`text-[11px]` + tighter padding. Net effect: fits on one row
  at the current width without wrapping.
- Explicitly did NOT force `flex-nowrap`/`whitespace-nowrap` on the row — Greg
  wants it to still wrap gracefully on a smaller display rather than guarantee
  overflow; kept `flex-wrap` with a sane `gap-y-1` for when it does wrap.
- All edits applied to `_showa/` first, then mirrored to `src/` and verified
  byte-identical (`now-playing-card.tsx`, `quality-pill.tsx`); tag-stack
  balance re-checked on the card.

**Round 19 (toggle row: panel removed + centering actually fixed; faceplate colour family shifted to taupe):**
- The Round 18 `.glass` housing on the cover/vinyl/lyrics/fullscreen icons
  wasn't working for Greg (visually) AND its centring fix didn't actually take
  (still centred on the cubby, not the stand) — both addressed together.
- **Panel removed.** Icons are now bare glyphs resting on the wood, same
  language as the transport row's shuffle/repeat (dim faceplate, no fill, no
  housing). Parent column gap bumped `gap-3`→`gap-6` for more breathing room
  now that there's no panel giving the row its own visual weight.
- **Centring fixed properly.** Root cause of the Round 18 failure: a sibling
  `w-[64%] justify-center` wrapper does NOT inherit the same centre line as
  CubbyArt's internal content wrapper — flex `items-center` centres each
  child as its own independent box; it's not a shared positioning reference.
  Fix: solved the actual geometry inside CubbyArt algebraically (content
  wrapper w-64% + pr-6%, art centred within at h-93%/aspect-square, against
  the cubby's fixed 900/584 aspect ratio) — yields a CONSTANT 66.08% of the
  cubby's total width, independent of render size. Toggle row is now
  `left-[66.08%] -translate-x-1/2` inside a `relative w-full` matching the
  cubby's own width basis exactly, mirroring how the stand itself centres
  (`left-1/2 -translate-x-1/2` on the art).
- **Faceplate colour family: cream (#E8E1D3) → taupe (#a78d7a)**, per Greg's
  direct hex. Scope clarified as the FULL family, not just `--faceplate`:
  `--foreground`, `--card-foreground`, `--faceplate`, `--faceplate-dim` all
  shifted in lockstep (hsl 25 20% 57% / dim 25 20% 51%, dim preserving the old
  pair's L-delta). `--muted-foreground` shifted proportionally too (hsl 25 18%
  34%) — confirmed explicitly with Greg despite landing fairly dim against
  the near-black panels; intentional, matches the new dimmer mood.
  `--primary-foreground`/`--accent-foreground`/`--destructive-foreground` left
  untouched — different semantic role (contrast-text ON the rust/velvet
  accents, not general faceplate text).
- **Outline check (per Greg's ask):** found one hardcoded hue tied to the old
  cream that wouldn't have followed the token swap — the volume slider thumb's
  bevel-SHADE colour (`hsl(33 20% 30%)`, picked to shade the old 40°-hue cream)
  realigned to `hsl(25 20% 30%)` to match the new family's hue. The bevel
  HIGHLIGHT (pure white) and the play-button asset's drop-shadow tint were
  left as-is — a metal highlight reads white regardless of base hue, and the
  play button is a PNG asset's own lighting, unrelated to the token.
- All edits applied to `_showa/` first, then mirrored to `src/` and verified
  byte-identical (`now-playing-card.tsx`, `globals.css`, `slider.tsx`); tag-
  stack balance re-checked on the card.

**Round 22 (presets panel; tonearm view-gating bugfix):**
- Built the presets panel (`preset-card.tsx`, rewritten in place — same
  filename/import path, not a new file) across three passes this session:
  initial build from the Lovart mockup + a live-app reference screenshot,
  then two rounds of screenshot-driven fixes. Recessed trough, up to 12 slots
  in two 6-up rows (trailing row hidden if entirely empty), three tile states
  (art / named-no-art / empty with a numbered brass blank), rust-frame active
  state driven by client-side tap memory (the WiiM API has no field that
  durably identifies "which preset is selected" — title-matching was tried
  first and broke once a station's metadata populated with a real track
  title instead of the station name). `dashboard.tsx`'s `PresetCard` prop
  contract changed from `currentLabel` to `playerState`+`sourceKey` to
  support this. Full detail (all three passes, including the divider PNG
  → CSS-groove rebuild that fixed a layout bug where the divider's portrait
  aspect ratio was inflating row height) is in `SESSION_HANDOFF.md` — this
  entry is a pointer, not a duplicate.
- Separately, fixed a real bug in the now-playing tonearm: it was rendering
  unconditionally regardless of the cover/vinyl/lyrics toggle, so it floated
  above cover art with no record under it. Gated on `view === "vinyl"`.
- A non-re-skin data-layer bugfix (Plex/DLNA casting — album art, bitrate,
  and play/pause state were all broken for this source) also happened this
  session, entirely in `src/lib/wiim/`. Not staged here — `_showa/` has no
  `lib/` tree by design, see `SESSION_HANDOFF.md` for full detail.

**Round 23 (presets panel → recessed cubby rebuild + two tuning passes):**
- Picked up the follow-ups Greg had queued after Round 22. Rebuilt
  `preset-card.tsx` from a single dark trough (tiles butted together, 1px CSS
  grooves) into **independent recessed walnut cubbies on a uniform
  `grid-cols-6`**. One structural change resolved three review items at once:
  the grid gap now IS the walnut wall between recesses (separators visible by
  construction, both directions — old `<Groove>`/`<RowSeam>` gone); the
  last-tile-in-row width bug is gone (uniform columns replace the old flex
  layout that donated a groove gutter from cells 1–5 but not the last cell);
  and the Round 22 art/caption split (which only existed to contain the
  self-stretching divider PNG) is reverted, captions back in their own grid
  cells with automatic column alignment.
- Two localized fixes in the same pass: the active tile gained the protruding
  rust **bar tab** beneath it (mockup) on top of the rust lacquer frame, and
  the empty-slot numeral got a tighter circle + thicker ring.
- CSS-first per Greg — a flat rectilinear recess, unlike the now-playing niche
  where CSS failed and a PNG was required. A reusable cubby-frame PNG fallback
  was offered but not needed.
- **Tuning pass 1**: row gap `gap-y-4`→`gap-y-8`; non-active art tiles
  desaturated to a warm monotone (`grayscale(1) sepia(0.5) brightness(1.04)
  contrast(0.96)`, 300ms transition), only the active tile in full colour;
  stronger cubby drop shadows + deeper tile-well inset. Flagged: CSS `filter`
  can't repaint a dark-background logo cream like the idealized mockup — a true
  cream duotone would need per-tile SVG `feColorMatrix`; Greg accepted the CSS
  monotone.
- **Tuning pass 2 (final, Greg confirmed "perfect")**: row gap
  `gap-y-8`→`gap-y-11` and bottom padding `pb-6`→`pb-11` so the space below
  row 2 matches the inter-row gap; empty-slot numeral tightened to `1.4em` and
  the digit re-centered — the ring is flex-centered and the glyph sits in its
  own inner `inline-block` span nudged up via `transform: translateY(-0.06em)`
  (the font's digit ink sits low in its line box, which is why line-height
  tweaks didn't move it; a transform on the whole span would drag the ring
  too). `translateY` is the exposed knob.
- All three passes source-only (`docker compose restart`), `preset-card.tsx`
  only (`PresetCard` prop contract unchanged → `dashboard.tsx` untouched),
  dual-written `src/`+`_showa/` and verified byte-identical by sha256 after
  each pass.

**Round 24 (source panel keycap resize fix + DLNA/radio/Plex service-name fix):**
- `keycap-button.tsx` gained an optional `className` prop and dropped its
  hardcoded width; `source-output-panel.tsx`'s keycap container switched from
  `flex flex-wrap` to a `grid` with `gridTemplateColumns: repeat(N, minmax(0,
  1fr))` (column count = that row's option count) so buttons shrink to fit a
  narrower window instead of wrapping — matching the Presets panel's existing
  behavior. (Superseded in Round 25 Pass 2–3, which replaced this with a fixed
  `KEYCAP_WIDTH` instead — see below.)
- Multi-part DLNA/radio/Plex service-name fix in `now-playing-info.ts`
  (`src/` only, no `_showa/` mirror — data layer): removed a bad `vendor`
  fallback that showed WiiM's internal "CustomRadio" aggregator name instead
  of the real station; lifted last-tapped-preset memory from `PresetCard` up
  to `dashboard.tsx` so `NowPlayingCard` can substitute the remembered preset
  name for the generic "Network" label (internet radio has no station name
  anywhere in the WiiM API); split the `"network"` service key from a new
  `"vendor"` key so a real vendor-reported name (confirmed via a captured
  Plex-hosted-preset payload: `mode:"10"`, `vendor:"Plex"`) can never be
  clobbered by the preset-name substitution. Net result: internet-radio
  presets show the station name; Plex shows "Plex" whether cast TO the device
  (mode 99) or pulled BY a saved preset (mode 10 + vendor).
- `service-logo.tsx` staged into `_showa/` for the first time this round (adds
  a `"vendor"` case to the Radio-icon fallback).

**Round 25 (Source/Output panel → Source/Output/Device panel, 5 passes):**
- `source-output-panel.tsx` gained a right-hand DEVICE column — device
  switcher/dropdown, Add Device/Settings/Logout action tiles, and a
  Model/Firmware/IP/Wi-Fi Signal (or Connection: Ethernet)/USB DAC info list
  — split from the SOURCE/OUTPUT half by a new vertical engraved seam
  (`VSeam`). This absorbs everything that used to live in `app-header.tsx`
  (device switcher, add/settings/logout — the header is now gone entirely)
  and the standalone `device-info-card.tsx` (also gone entirely). Both are
  orphaned on disk, unreferenced, same convention as the Round 21 orphans.
  `dashboard.tsx` no longer imports either and the panel is no longer gated
  on `online` state (it's now the only way to switch off a dead device).
- **Pass 2** fixed a real bug: SOURCE/OUTPUT rows used to be independent CSS
  grids that stretched to fill the row width, so a device with fewer options
  (confirmed on Greg's bedroom WiiM) rendered visibly larger buttons. Replaced
  with a shared fixed `KEYCAP_WIDTH` in a left-aligned flex row — button size
  is now identical regardless of option count, superseding Round 24's grid
  approach. Also dropped the online dot (device name just dims when offline)
  and fixed an accidental all-caps on the action-tile labels.
- **Pass 3** restacked each row vertical (label above the keycap run, per the
  mockup, dropping the old 96px left-margin label gutter); `KEYCAP_WIDTH`
  150→100px; DEVICE column 320→460px; moved the dropdown + action tiles to
  `.glass` for raised-bevel dimensionality. This pass also corrected a deploy
  assumption: `docker compose restart` wasn't surfacing source changes for
  Greg, only `--build` was — `--build` is the default now regardless of
  whether new `public/` assets are involved.
- **Pass 4** added a new `.control-tile` CSS class (`globals.css`) — a
  flatter cousin of `.glass` (faint 1px inset highlight/shade + a crisp edge
  ring, no wide highlight or deep two-stop shadow) for the dropdown
  compartments + action tiles, since `.glass` read as too pillowed/rounded at
  button scale against the mockup. DEVICE column 460→600px, l/r padding to
  `4rem`. The dropdown's popup menu intentionally stays `.glass` (floating
  panel, not a control face).
- **Pass 5**: unrelated wrap-up tweak — now-playing card left-column width
  `48%`→`45.5%` (`now-playing-card.tsx`).
- All 5 passes dual-written `src/`+`_showa/`, verified byte-identical,
  balance-checked. Open (non-blocking) flags for a future pass: the dropdown
  compartment `gap-2` vs. a shared seam, and `.control-tile`'s exact shadow
  values as a tuning candidate.

**Round 26 (lyrics lookup fix + panel resize):**
- Fixed two independent bugs behind "No lyrics found" showing on real,
  popular tracks: (1) LRCLIB's `/api/get` 404s on ANY album-name mismatch
  between what WiiM/streaming services report and LRCLIB's stored album
  title — fixed with a fallback to LRCLIB's `/api/search` (no album
  required) when `/get` returns nothing, scoring candidates by synced-lyrics
  availability + duration closeness; (2) LRCLIB's API genuinely takes 7–10s
  to respond (measured directly via `fetch`/`https`/`wget` as timed
  subprocesses — confirmed server-side, not a client or Docker networking
  issue), which the original 6s timeout was aborting before real responses
  arrived — fixed by raising the timeout to 12s. Both in `src/lib/lyrics/
  lrclib.ts` (`src/` only, data layer, no `_showa` mirror).
- `lyrics-view.tsx`: default container `size-44 sm:size-52` (11–13rem
  responsive) → flat `size-[19rem]`; `rounded-2xl` removed. First time this
  file is staged into `_showa/` (dual-written from here on). Kiosk's
  fullscreen lyrics view passes its own `sizeClass` and is unaffected.
- Drafted a GitHub issue for the upstream repo documenting both bugs + fixes.

**Round 27 (Source/Output/Device panel accordion, pending Greg's live review):**
- `source-output-panel.tsx`: the whole panel is now collapsible, closed by
  default, per-session-only state (no persistence). Trigger is the first row
  inside the `Card` (so the collapsed panel still reads as one bordered
  block) — styled `.control-tile`, reads `Radio Source | Speaker Output |
  Settings Device` with a `ChevronDown` that rotates 180° when open. Content
  (SOURCE/OUTPUT/DEVICE, internals untouched) wrapped in a CSS
  `grid-template-rows: 0fr → 1fr` accordion — no JS height measurement, no
  new dependency. Considered adding `@radix-ui/react-collapsible` but it
  isn't installed and framer-motion (which is) doesn't cleanly animate
  unmeasured `height: auto`; Greg chose the dependency-free CSS approach.
  Not yet confirmed live — pipe-separator color and 300ms transition
  duration are both unconfirmed guesses pending review.

**Round 28 (EQ panel — Graphic EQ view + shared chrome, Parametric deferred):**
- `eq-card.tsx` first staged into `_showa/`. Re-skinned the shared shell
  (EQUALIZER wordmark, tan-tile source + Graphic/Parametric sub-tabs with a
  CSS `Led` dot, POWER knob) and the Graphic EQ 10-fader bank. Parametric EQ
  view intentionally left as the original default-styled band table — a
  later pass, picked up next round.
- POWER knob (`power-btn.png` lit base / `power-off-overlay.png` dark cap)
  replaces the old enable `Switch`. No CSS-added glow on the lit state — the
  asset's own ring already carries the warmth, so a stacked glow just
  doubled up. ON/OFF engraving anchored a fixed 48px from the knob's own
  left edge rather than a negative `right-N` offset from the knob itself,
  after the first pass clipped "OFF" to "OFI" against the card's
  `overflow-hidden` edge.
- `EqSlider` wraps Radix's vertical slider: 10px recessed groove (widened
  from an initial 6px), tick hairlines in `hsl(26deg 12% 58% / 31%)`, cream
  `eq-knob.png` cap thumb with a hard directional shadow
  (`drop-shadow(6px 7px 8px rgba(0,0,0,1))`) — Greg's exact spec, replacing
  an earlier two-stop soft-blur guess.
- Header layout: Graphic/Parametric sub-tabs sit a fixed `gap-x-16` after
  the source tabs instead of being pushed to the panel's far edge via
  `justify-between` — more breathing room than the first-pass `gap-x-9`.
- Footer: rename/delete/save tiles moved to sit immediately beside the
  Presets dropdown on the left, instead of split to the panel's far-right
  edge (which is now empty).
- Active tab/dropdown labels no longer get `font-medium` — the LED alone
  carries selected state, per Greg (bold read as redundant/competing with
  the lamp).
- Mid-session, `src/eq-card.tsx` was found to have drifted ahead of the
  `_showa/` mirror — five of six live-review fixes had landed in `src/`
  only, breaking dual-write parity outside this session's own edits. Synced
  `_showa/` back to match `src/` exactly (sha256-verified) before applying
  the remaining fix, so both trees are byte-identical again. Cause unknown;
  worth a quick sanity check next session if it recurs.
- Confirmed live "good" by Greg after two tuning passes (six fixes, then
  three more: shadow spec, tick color, tab spacing).

**Round 29 (EQ panel — Parametric EQ view, this session):**
- See SESSION_HANDOFF.md for full detail. Now confirmed live.

**Round 30 (PEQ data-layer investigation, prior session):**
- Diagnosed why parametric presets showed all-default values: the app
  hardcoded `channelMode: "Stereo"` but the device (set from the WiiM phone
  app) was in L/R mode, where bands come back under `EQBandL`/`EQBandR`
  instead of `EQBand`. Also discovered: 12 bands (a–l, not 10), six filter
  types (Off/LS/PK/HS/LP/HP with confirmed mode numbers), and independent
  per-channel values in L/R mode. Full spec written to
  `_showa/PEQ_LR_SPEC.md`. No code changes this round (data layer only).

**Round 31 (PEQ L/R support + six filter types + reset, this session):**
- Implemented the Round 30 spec (Milestones A+D + Option A mode switch).
  Data-layer changes across `eq-constants.ts`, `types.ts`, `eq.ts`,
  `route.ts` (all `src/` only). UI changes in `eq-card.tsx` (dual-write):
  Stereo/L/R mode dropdown + L/R channel toggle buttons + all 6 filter
  types in the type dropdown + LP/HP gain-disable (greyed out, "N/A") +
  `FreqInput` converted to controlled (fixes decimal display + channel-
  switch stale value) + reset-to-defaults button with confirmation dialog
  (works for both Graphic and Parametric). Tab button font `text-sm` →
  `text-xs` (0.75rem). All confirmed working live by Greg.

**Round 29 (EQ panel — Parametric EQ view, original entry):**
- `ParametricPanel`/`PeqRow` rebuilt from the original default-styled band
  table into a hardware-style row layout, per a Lovart mockup Greg shared.
  Per band (10 rows, a–j): band letter, `TypeDropdown` (tan tile, same
  face recipe as the header `TabButton`s), `FreqInput` (recessed dark
  readout box, editable, "Hz" suffix), then two `PeqAxis` controls — **Q
  before Gain**, deliberately swapped from the mockup's Gain-then-Q order
  per Greg's correction. Column headers (Type/Freq/Q/Gain) left-aligned
  above each column, not centered over the track.
- **`PeqSlider`**: a new horizontal slider reusing the existing
  `eq-knob.png` cap (scaled down to `w-6`, no new asset) on a recessed
  groove matching the graphic faders' track recipe. Supports a `scale`
  prop (`"linear"` or `"log"`) — Radix is driven on a log-transformed
  domain for Q so the 0.1–24 range isn't crushed into a sliver at linear
  scale (most useful Q adjustment happens in a narrow band).
- **`PeqAxis`**: pairs a `PeqSlider` with a numeric readout and a row of
  tick marks rendered in a separate strip **below** the track (mockup had
  them inline on the track itself — Greg's explicit ask to move them).
  Tick positions are computed from the slider's own scale, so they land
  under the value they represent on both linear and log axes.
  - Gain ticks: −12 / −6 / 0 / +6 / +12 (linear, matches `PEQ_RANGE`).
  - Q ticks: 0.1 / 0.5 / 1 / 2 / 4 / 8 / 16 / 24 (log-spaced).
  - The reference tick (Gain 0dB, Q 1.0) renders slightly taller/brighter
    — a center-detent cue, like a real fader.
- Value formatting: Gain `+4.2 dB` / `0.0 dB` / `-6.0 dB` (1 decimal,
  signed); Q `1.00` / `1.20` (2 decimals) — matches the mockup's readouts.
- `Slider` (the generic `@/components/ui/slider` component) is no longer
  imported by this file — removed the now-unused import.
- Source-only change (no new `public/` assets) — `docker compose up -d
  --build` to see it live, review pending.

**Round 32 (sub-out panel re-skin + EQ LED / knob cleanup):**
- `sub-card.tsx` full re-skin (new `_showa/` mirror): `CircleDot` wordmark
  icon, `PowerKnob` (no ON/OFF labels), Level + Crossover as `SubSlider`
  components (recessed groove, `eq-knob.png` cap, live `−`/`+` step buttons,
  value readout), Phase row with tan-tile buttons + PNG LEDs. Full-width
  layout in `dashboard.tsx` grid. "connected" pill removed entirely.
  `sub.connected` still on the type but intentionally not rendered.
- `eq-card.tsx`: LED component switched from CSS jewel to `led-on.png` /
  `led-off.png` PNG assets (`size-3.5`); PowerKnob ON/OFF engraving labels
  removed, wrapper `pr-8` → `pr-[1.8rem]`.
- `caps.subwoofer` false positive discovered this round (sub panel showed on
  Bedroom WiiM with no sub hardware) — deferred to Round 33.

**Round 33 (`caps.subwoofer` data-layer fix + GitHub issue draft):**
- Data-layer only (`src/lib/wiim/capabilities.ts`, `src/` only, no
  `_showa/` mirror). No visual changes.
- **Root cause:** `detectCapabilities()` keyed `subwoofer` capability on
  `level`/`status` field presence in the `getSubLPF` response, but every
  LinkPlay device answers that command with a default template that includes
  both fields — so a device without sub-out hardware passed the check.
- **Fix:** rekeyed on presence of the `plugged` field (`subJson.plugged !=
  null`), which only appears in the response on real sub-out hardware (also
  accompanied by `delay_main_sub` and `linein_delay`). Presence rather than
  the 0/1 value, so the capability tracks the hardware, not the live
  physical connection.
- **Verification method:** probed both devices live (`getSubLPF` direct HTTP,
  decoded byte arrays). Confirmed discriminator on Greg's two devices (Ultra
  at 192.168.1.102 has `plugged`; Bedroom at 192.168.1.195 does not).
- **The real gotcha:** after fix + rebuild, the panel still showed. Cause:
  capabilities are SQLite-cached in the `devices` table inside the Docker
  container (`/data/wiim.db`) and only refreshed by the
  `/api/devices/[id]/refresh` route or on device re-add — NOT by rebuilds,
  reboots, or panel toggles. The Bedroom device's row was written June 28
  (a week before the fix), confirmed via `updated_at` epoch-ms. Corrected
  directly by a `.cjs` node script inside the container (flipped
  `subwoofer` to `false`). Going forward: any UI-triggered refresh or
  re-add runs the new code path correctly.
- **GitHub issue drafted:** `_showa/SUBWOOFER_CAPS_ISSUE.md` — both device
  payloads, the fix, the cache note, and a maintainer caveat (discriminator
  verified on Greg's hardware only; other sub-capable models, e.g. Amp/Amp
  Pro/Amp Ultra/Pro Plus, very likely expose `plugged` but unconfirmed).
  Device captures saved as `_showa/diag-102.json` / `_showa/diag-195.json`.

## Known gaps / deferred work

- **Palette re-check, explicitly deferred — see "Open thread" above.** Do not
  apply the `#B19D8B` / `#C64C1A` retune without the user actively asking for
  this specific pass; it was flagged as a *future*, separate piece of work.
- **Texture/lushness.** The now-playing card face + the cabinet now carry
  procedural grain (Round 10); the presets panel (`presetsPanelGrain`, Round
  22) and EQ panel (`eqPanelGrain`, Round 28) carry it too. Remaining flat
  panel: sub-out — can reuse the `panelGrain` svg pattern.
- Wood-grain texture: DONE for the cabinet (fixed `<svg>` in `layout.tsx`,
  soft-light @ 0.72) and the now-playing card face (`panelGrain`, soft-light
  @ 0.13). Not yet on the other cards.
- Now-playing card structural work not yet started: niche/cubby seating for
  album art, transport button material (matte domed cylinders), brass/LED
  treatments — see "Not yet started on this card" above for the full list.

## What this pass deliberately does NOT do

- No niche/cubby structural rebuild yet — album art is still a plain rounded
  square sitting in a flex column, not seated in the recessed-walnut cubby
  photo background. That's the next major structural piece, not started.
- No brass-key or LED treatment on the now-playing card. (Source/Output
  still lacks brass keys; EQ tabs gained a CSS LED indicator in Round 28.)
- Source/Output and Presets cards have card-specific work done (Rounds
  21–23 — see changelog); EQ's shared chrome + both views done Rounds
  28–29 (Graphic then Parametric). Sub-out is untouched beyond the
  shared token layer (palette/`.glass`/radius).

## Status

- [x] Token layer (palette, `.glass`, material colors)
- [x] Real fonts loaded (Antonio / IBM Plex Sans / IBM Plex Mono via next/font)
- [x] `.glass` opacity fix
- [x] `.glass` inset-shadow fix (was reading as floating, not recessed)
- [x] Quality-pill + StreamInfoLine slate-grey → faceplate-cream (both instances)
- [x] Card radius token fix
- [x] Removed hardcoded violet tint from now-playing-card
- [x] Build fix: `_showa` excluded from `tsconfig.json` + `.dockerignore`
- [x] Font classes applied to real elements (title/timestamps/volume/codec/quality-pill)
- [x] Title rescaled + all-caps + marquee-on-overflow, matched to Lovart mockup measurements
- [x] Artist line bold-uppercase, album line font-mono — matched to mockup
- [x] Engraved seam between metadata block and transport row
- [ ] Palette retune (`#B19D8B` faceplate / `#C64C1A` rust) — explicitly deferred, don't start unprompted
- [ ] Niche/cubby seating for album art (still a plain rounded square)
- [x] Transport row material — real play/pause PNG (`public/play-button.png`) + bare-glyph prev/next/shuffle/repeat (superseded the CSS matte-cylinder plan)
- [x] Scrubber + volume restyled — `Slider` `seek`/`volume` variants (thin track + dot knob; rust seek / cream volume)
- [x] Volume −/+ steppers removed (desktop-only) — plain `Slider variant="volume"`
- [x] Source + bitrate pills removed from card top (only the moon remains); bitrate moved into the stream-info band (`QualityPill` `readout` tone)
- [x] Stream-info promoted to its own recessed full-bleed footer band
- [x] Metadata↔transport seam centered in its gap (`mt-[44px]`/`mt-[44px]`)
- [x] Album-art colour wash removed from now-playing card
- [x] Transport + volume merged into one horizontal row
- [x] Page shell widened to `max-w-[78rem]` (staged `dashboard.tsx`)
- [x] Spacing rhythm pass (`mt-[76px]` before transport; 2nd seam above stream-info)
- [x] StreamInfoLine left-aligned + text-sm + larger logo; HI-RES LOSSLESS gold → rust
- [x] Cabinet woodgrain applied — fixed `<svg>` in `layout.tsx`, soft-light @ 0.72 (locked 0.006/0.25 · 5 · seed 3)
- [x] Now-playing panel face texture — `panelGrain` svg, fractalNoise 0.022/2 + contrast stretch, soft-light @ 0.07; plus `panelGrain2` finer second layer, fractalNoise 0.45/2, soft-light @ 0.10 (Round 11)
- [x] Walnut margin — dashboard `<main>` `py-20`
- [ ] Panel texture on presets (`presetsPanelGrain`/`presetsPanelGrain2`,
      Round 22) and EQ (`eqPanelGrain`/`eqPanelGrain2`, Round 28).
      Source/Output and Sub-out still untextured.
- [ ] Source / Output card — brass keys + LED indicators
- [x] Presets card — BUILT (Round 22) then rebuilt into recessed walnut cubbies
      on a uniform `grid-cols-6` (Round 23): warm-monotone non-active tiles,
      full-colour active tile with rust frame + protruding bar tab, tight
      thick-ring blank-slot numerals. Greg confirmed "perfect" — the follow-up
      tweaks are done.
- [x] EQ card (Graphic EQ view + shared chrome) — BUILT (Round 28): tan-tile
      source + Graphic/Parametric sub-tabs with PNG LED at `h-[0.7rem]
      w-[0.7rem]` (Round 33: downsized from `size-3.5`; Round 32: switched
      from CSS jewel to `led-on.png`/`led-off.png`), POWER knob (Round 32:
      ON/OFF engraving labels removed; Round 33: `TabButton` padding tightened
      `px-4` → `px-[0.5rem]` to fix tab-row wrap; `SlidersVertical` icon
      added to EQUALIZER wordmark), 10-fader recessed graphic bank with tick
      marks + knob-cap thumb, footer Presets dropdown grouped with
      rename/delete/save. Confirmed live.
- [x] Sub-out card — BUILT (Round 32–33): `CircleDot` icon, PowerKnob
      (no ON/OFF labels), Level + Crossover horizontal sliders with live
      −/+ step buttons + `eq-knob.png` thumb + unlabeled tick marks (31 dB
      ticks for Level; 4 Hz ticks at 50/100/150/200 for Crossover), Phase
      row with tan-tile buttons + `h-[0.7rem]` PNG LEDs. Full-width layout
      (`px-36` body padding). "connected" pill removed. Confirmed live.
      `caps.subwoofer` false positive CLOSED (Round 33) — see changelog.
- [x] Kiosk/fullscreen view — BUILT (Round 34): walnut cabinet background
      + inline `kioskGrain` SVG (same feTurbulence params as `cabinetGrain`,
      unique filter ID); Antonio title + rust artist + mono album; play-button.png
      dome at `size-[72px]`; bare-glyph prev/next/close (no housing);
      `variant="volume"` slider + three-way mute icon; `tone="readout"`
      QualityPill; faceplate tokens throughout. Album color wash retained.
      Confirmed live — Greg: "looks perfect".
- [x] Upstream sync audit (Round 34): codebase confirmed on v0.3.6 (latest),
      all Showa work as unstaged modifications on top, no merge needed.
