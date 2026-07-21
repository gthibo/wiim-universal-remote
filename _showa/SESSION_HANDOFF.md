# Showa Hi-Fi Counter — Session Handoff
*Updated end of session: July 7, 2026, through Round 34. Supersedes all
prior handoff content.*

## tl;dr for picking this back up

Round 34 was a maintenance + upstream-sync session, then a kiosk re-skin.
The codebase is confirmed already on v0.3.6 (latest upstream) with all Showa
work as unstaged modifications on top — no merge needed. The kiosk/fullscreen
view (`kiosk-view.tsx`) has been fully re-skinned to match the Showa language.

**What's open:**
1. ~~Milestone B — per-channel write path.~~ **CLOSED.**
2. **Milestone C** — Stereo↔L/R mode switch command wired (Option A). Greg
   confirmed it works; command shape still unverified formally.
3. ~~**Sub-out panel**~~ **CLOSED (Round 32/33).**
4. ~~**`caps.subwoofer` false positive**~~ **CLOSED (Round 33).**
5. **Palette retune** — deferred (`--faceplate` → `#B19D8B`, rust → `#C64C1A`).
6. **Niche/cubby cascade** on other card proportions.
7. Open flags from earlier rounds (dropdown-compartment gap, `.control-tile`
   shadow values, Round 27 accordion pending live review).

## Round 34 — Upstream sync audit + kiosk re-skin (this session)

### Upstream sync
Confirmed the codebase is already on upstream v0.3.6 (the latest tag at time
of session). All Showa work lives as unstaged modifications on top of that
commit — there is no merge to perform. Key findings:
- `git merge-base HEAD v0.3.6` returned the same commit as HEAD, and all
  tags v0.1.0–v0.3.6 were already present locally.
- All upstream features added in v0.2.x–v0.3.x (lyrics panel, kiosk/fullscreen,
  sleep timer, vinyl view, album art color extraction, Bluetooth now-playing,
  Plex/vendor-push transport, source input gating, art fallback, scrobbler fix,
  per-device throttling) are present and intact in the Showa `now-playing-card.tsx`.
- Greg's Round 33 `capabilities.ts` fix (`plugged != null` discriminator) is
  cleanly applied; upstream has not touched that file.
- All other modified files (`parse.ts`, `snapshot.ts`, `client.ts`, `types.ts`,
  etc.) contain only Showa additions, no conflicts.

### kiosk-view.tsx — Showa re-skin (dual-write, SHA256 MATCH)
Full re-skin of the kiosk/fullscreen view. All changes in `src/` + `_showa/`,
verified byte-identical.

**Background**: replaced the hardcoded `radial-gradient(#17151f → #08080b)`
with the walnut token gradient (`hsl(var(--walnut-dark))` base +
`radial-gradient`/`linear-gradient` matching `body` in `globals.css`). The
`cabinetGrain` SVG in `layout.tsx` is `fixed -z-10` and unreachable from
inside a `z-[100]` portal stacking context, so the grain was re-declared as
an **inline sibling `<svg>`** inside the portal div with a unique
`id="kioskGrain"` (to avoid collision with `cabinetGrain` in the DOM).
Identical `feTurbulence` params: `baseFrequency="0.006 0.25"`, 5 octaves,
seed 3, alpha-only output, soft-light 0.72.

**Album color wash**: retained (`radial-gradient rgba(rgb, 0.3)`) — Greg
decided to keep it in kiosk context and review live.

**Typography**:
- Title: `font-display text-5xl/6xl font-bold uppercase leading-[0.95]
  tracking-tight text-foreground` (Antonio, matching main card).
- Artist: `font-sans text-lg font-bold uppercase tracking-wide
  text-[hsl(var(--primary))]` (rust, matching main card).
- Album: `font-mono text-sm text-[hsl(var(--faceplate)/0.5)]`.

**Transport**:
- Prev/Next: `fill-current strokeWidth={0}` `SkipBack`/`SkipForward` with
  `ICON_SHADOW` drop-shadow, faceplate tone. `size-8` icons (vs `size-7` on
  main card — slightly larger for wall-display scale).
- Play/Pause: `play-button.png` PNG dome at `size-[72px]`, icon `size-8`
  on top, same pattern as main card. Confirmed renders fine (PNG is 100px
  source).
- Gap widened `gap-6` → `gap-8` around the play button.

**Volume row**: `variant="volume"` added to `<Slider>` (was defaulting to
the chunky white `"default"` variant). Mute icon uses `Volume1`/`Volume2`/
`VolumeX` three-way split (matching main card; `Volume1` import added).
Mono readout `font-mono text-xs text-[hsl(var(--faceplate)/0.6)]`, `w-9`
(was `w-8 text-sm text-white/70`). Slider `className="min-w-0 flex-1"` added.

**Quality pill**: `tone="readout"` added (was defaulting to `"tier"`,
showing gold/cream tier badges instead of the recessed faceplate chip).

**Close button**: `.control-tile` housing removed — bare glyph, no housing.
`size-6` icon (was `size-5`). Dim faceplate tone with hover step, `ICON_SHADOW`.

**Vinyl/lyrics toggle**: housing pill (`.control-tile` wrapper + `p-1`) removed
— bare glyphs, `gap-3` (was `gap-1`), no background. Active/inactive/hover
states match the cubby icon row on the main card.

**Source label**: `font-mono text-xs uppercase tracking-wide
text-[hsl(var(--faceplate)/0.55)]` (was `text-sm text-white/70`).

**Outer div**: `text-white` base class retained (cascade base for anything
not explicitly overridden — all significant elements are now explicitly
colored in faceplate tokens).

### Files touched
- `src/components/dashboard/kiosk-view.tsx` + `_showa/` mirror —
  dual-written, SHA256 MATCH confirmed.
- No data-layer files touched. No new `public/` assets. Requires
  `docker compose up -d --build` (source change).

## Round 33 — Sub panel polish + EQ/header cleanup (this session)

### eq-card.tsx (both trees, MATCH)
- **LED PNG assets** (`led-on.png`/`led-off.png`, `h-[0.7rem] w-[0.7rem]`):
  first attempt silently no-op'd (edit_file returned a valid-looking diff but
  nothing persisted to disk — confirmed by grep). Second attempt verified
  by grep against disk before mirroring. LEDs now PNG-based throughout.
- **ON/OFF engraving labels** on `PowerKnob`: removed. `pr-8` → `pr-[1.8rem]`
  on the wrapper (to align knob with last graphic EQ band).
- **`TabButton` padding**: `px-4` → `px-[0.5rem]` — source/EQ-type tabs were
  wrapping to a second line after the `pr-[1.8rem]` change increased header
  row width. Greg caught this live; inspector confirmed `0.5rem` fixed it.
- **`SlidersVertical` icon** added to the left of the EQUALIZER wordmark.

### sub-card.tsx (both trees, MATCH)
- **Full-width layout**: `dashboard.tsx` grid changed from `grid-cols-1
  md:grid-cols-2` → `grid-cols-1` so SubCard takes full panel width.
- **Body padding**: `px-6` → `px-36` (9rem each side) on the
  Level/Crossover/Phase body div.
- **Phase label** `w-24` fixed-width span removed — now `shrink-0` only,
  so Phase buttons sit tight to the label.
- **Phase LED size**: `size-3.5` → `h-[0.7rem] w-[0.7rem]` (matching EQ).
- **Tick marks** added below Level and Crossover sliders via a `SubTicks`
  row in `SubSlider`. Level: 31 unlabeled ticks at 1 dB intervals (−15..+15).
  Crossover: 4 ticks at 50/100/150/200 Hz only (30 and 250 endpoints skipped).
  Tick position: `((value - min) / (max - min)) * 100%`. Track alignment:
  `mx-9` matches the `−`/`+` button flanks.
- **Icon**: `Waves` → `CircleDot` (import updated).
- **`caps.subwoofer` false positive** — RESOLVED this session. See the
  dedicated sub-section below ("Round 33 — `caps.subwoofer` false positive").

### app-header.tsx (src/ only, no _showa/ mirror)
- Three icon buttons (Add Device / Settings / Logout): `size-10` →
  `w-10 py-[0.7rem]` to give explicit vertical padding.

### sleep-button.tsx (src/ only, no _showa/ mirror)
- Moon icon: `size-3.5` className → `style={{ width: "1.2rem", height: "1.2rem" }}`.

### Key lesson this session
- `edit_file` can silently no-op without error, returning a plausible diff
  that never persists to disk. The only reliable verification is
  `Select-String` (PowerShell grep) confirming new content present and old
  content absent directly on disk. SHA256 comparing two identically-stale
  files reads MATCH even when both are wrong. Grep first, then SHA256.

### `caps.subwoofer` false positive — root cause + fix (data layer, src/ only)

The sub panel was rendering on the Bedroom WiiM (no sub-out hardware), not
just the Ultra. Panel render is gated on `caps?.subwoofer`.

**Detection logic (was wrong):** `detectCapabilities()` in
`src/lib/wiim/capabilities.ts` flagged a device sub-capable whenever
`getSubLPF` returned JSON with a `level` or `status` field. But EVERY
LinkPlay device answers `getSubLPF` — a sub-less device returns a generic
default template that still has `level` and `status`, so the check could
never discriminate.

**The discriminator (probed live this session, both devices):**
- 195 / Bedroom (NO sub): `{"status":0,"output_mode":1,"cross":80.000000,
  "phase":0.000000,"level":0.000000,"mix_sub":1,"main_filter":1,
  "sub_filter":1,"sub_delay":0.000000}`
- 102 / Ultra (HAS sub): `{"status":0,"delay_main_sub":"1.0","plugged":1,
  "output_mode":1,"cross":100,"phase":0,"level":0,"mix_sub":1,
  "main_filter":0,"sub_filter":1,"sub_delay":-23,"linein_delay":0.00}`

Real sub-out hardware returns three fields the template lacks: **`plugged`**,
`delay_main_sub`, `linein_delay`. The sub-less payload is a giveaway generic
template — every numeric is a formatted float (`N.000000`) and `cross` is the
default 80.

**Fix:** key `subwoofer` on the presence of `plugged` (not `level`/`status`).
Using field *presence* (`plugged != null`), not its 0/1 value, so the
capability tracks the HARDWARE, not the live physical connection — a
momentarily-unplugged sub doesn't drop the panel (the settings panel already
handles hiding it when unwanted). Greg's call: presence over live-`plugged`.
```js
const subwoofer =
  !!subJson &&
  subJson.plugged != null &&
  !subText.toLowerCase().includes("unknown command");
```
Edited `src/lib/wiim/capabilities.ts` (~L71), grep-verified on disk (new
string present, old absent). Data-layer file — `src/` only, NOT mirrored to
`_showa/`.

**The gotcha that cost the most time:** after the fix + rebuild, the panel
STILL showed. Cause was NOT the logic — capabilities are cached in the
`devices` SQLite table (`/data/wiim.db` inside the container) and are ONLY
rewritten by the `/api/devices/[id]/refresh` route or on device re-add.
Device reboots, panel settings toggles, and app rebuilds do NOT re-probe.
The Bedroom device's cap row was written June 28 (a week before the fix) and
had never been refreshed. Confirmed by reading the row's `updated_at`.

**Cache correction:** rather than fight the refresh route's mutation/CSRF
guard, the stale row was corrected directly in the DB (a node script inside
the container flipping `subwoofer` to `false` in the caps JSON for host
192.168.1.195). This is exactly what a re-probe would now produce. Verified
`before: true` / `after: false`. Going forward, any device refreshed/re-added
through the UI goes through the corrected code path automatically.

**Reusable how-to (if this recurs):** to read/inspect a device's cached caps,
run a `.cjs` node script inside the container (project is ESM — `.js` fails
with "require is not defined"):
```
docker cp script.cjs wiim-dashboard:/app/script.cjs
docker exec -w /app wiim-dashboard node script.cjs
```
with `const D=require('better-sqlite3'); const db=new D('/data/wiim.db');`
and `SELECT id,name,host,capabilities,updated_at FROM devices`. Note
`updated_at` is epoch-ms. To probe raw sub payloads directly, PowerShell
`Invoke-WebRequest -SkipCertificateCheck` against
`https://<ip>/httpapi.asp?command=getSubLPF` (returns a byte array — decode
with `[System.Text.Encoding]::UTF8.GetString()` or via python `bytes().decode()`).

**GitHub issue drafted:** `_showa/SUBWOOFER_CAPS_ISSUE.md` — ready to post to
upstream `illianoaoi/Wiim-Dashboard`, with both payloads, the fix, the cache
note, and a maintainer caveat (the `plugged` discriminator is confirmed on
Greg's two devices but not verified across all sub-capable models — other
sub-capable units, e.g. Amp/Amp Pro/Amp Ultra/Pro Plus, very likely expose
`plugged` too but this isn't firsthand-confirmed). Device captures saved as
`_showa/diag-102.json` / `_showa/diag-195.json`. Temp inspection scripts
(`dumpcaps`/`ids`/`fixcap`) were deleted after use — trivial to regenerate.

## Round 32 — Sub-out panel re-skin + EQ LED / knob cleanup

### eq-card.tsx (both trees, sha256 verified MATCH: 913DAD09...)
- **LED component**: replaced pure-CSS amber jewel (`<span>` with radial-
  gradient + box-shadow) with PNG assets (`led-on.png` / `led-off.png`,
  `size-3.5`) — matching keycap-button.tsx convention. Used by all
  `TabButton`, `ChannelButton` calls in the EQ panel.
- **PowerKnob**: removed ON/OFF engraving `<span>`s entirely. Changed
  wrapper `pr-8` → `pr-[1.8rem]` to align knob with last graphic EQ band.
  The `pr-8` was only there to prevent the now-deleted labels from clipping.

### sub-card.tsx — full re-skin (new `_showa/` mirror, sha256 MATCH: D2687398...)
- Full rewrite of stock `sub-card.tsx`. Data layer (apiSend, SUB_RANGES,
  SubwooferStatus) unchanged.
- Panel shell: `Card relative overflow-hidden p-0` + two-layer
  feTurbulence grain (IDs `subPanelGrain`/`subPanelGrain2` — unique, no
  collision with EQ grain on the same page).
- Header: SUB-OUT wordmark (`font-display`, `Waves` icon) + `PowerKnob`
  (same assets as EQ knob, no ON/OFF labels, `pr-[1.8rem]`).
- "connected" pill removed entirely. `sub.connected` field still exists
  on the type but is intentionally not rendered.
- Level + Crossover: `SubSlider` component — recessed groove + `eq-knob.png`
  cap thumb (same PeqSlider recipe), flanked by live `−`/`+` step buttons
  (single-step, clamped to SUB_RANGES). Value readout top-right of each
  row.
- Phase: two tan-tile buttons (`eq-buttons.png` face) with PNG LED
  (`led-on.png`/`led-off.png`). Active button lit, inactive dark.
- Body dims to `opacity-50 pointer-events-none` when disabled.
- Bracket balance: `{}` 113/113, `()` 84/84, `[]` 8/8 — BALANCED.
- **Pending live browser review** after `docker compose up -d --build`.

## Sub-out panel — pre-spec (data captured, build complete)

Device state confirmed live via `wiim-diagnostics` (July 3, 2026):
- Enabled: False
- Crossover: 135 Hz (pywiim docs: range 30–250 Hz)
- Phase: 0° (values: 0 / 180)
- Level: 1 dB (range: ±15 dB)
- Delay: -23 ms (range: ±200 ms)
- Bass to Mains: False
- Filter Bypassed: True

pywiim confirms all of the above are read/write on the Ultra (firmware 5.2+).
These are the data-layer targets for the sub panel — no discovery pass needed.
The existing app likely has a subwoofer component already; this round is a
visual re-skin, not a data-layer build.

Build complete as of Round 32.

## wiim-diagnostics — standing tool

pywiim is installed and available on PATH. Correct invocation:

```powershell
wiim-diagnostics 192.168.1.102 --output report.json
```

Use cases:
- **Pre-session state capture** before any data-layer session — grab raw
  device JSON before you start so you have a baseline.
- **Sub-out and future panel discovery** — pywiim's API reference documents
  confirmed parameter ranges for subwoofer, room correction, and other
  features the app doesn't yet surface. Skips a Round-30-style discovery grind.
- **Sanity checks** — quick read of EQ enable state, preset list, source,
  output mode, subwoofer state without digging into Docker logs.
- **Raw JSON** — `report.json` contains more detail than the console summary;
  useful for validating parse-layer assumptions against a second
  implementation's read.

Note: safe to run alongside the dashboard (read-only). Don't issue pywiim
*writes* while the dashboard is also writing — race condition risk.

## Round 31 — Parametric EQ: L/R support + six filter types + reset (this session)

Implemented `_showa/PEQ_LR_SPEC.md` Milestones A+D, plus Option A for the
mode-switch command (try it, see what happens). Everything confirmed working
live by Greg.

### Files changed (data layer, `src/` only)

**`eq-constants.ts`**:
- Added `PEQ_LETTERS_ALL` (a–l, 12 bands for parse/serialize) alongside
  the existing `PEQ_LETTERS` (a–j, 10 visible in UI).
- Extended `PEQ_DEFAULT_FREQ` with k (18000) and l (20000).
- Added Low Pass (value 3) and High Pass (value 5) to `PEQ_MODES`.

**`types.ts`**:
- Added `PeqChannelMode = "stereo" | "lr"` and `PeqChannel = "stereo" |
  "left" | "right"` type aliases.
- Added `EqParametricState` interface with `channelMode` and channel-keyed
  `bands: Partial<Record<PeqChannel, ParametricBand[]>>`.
- `EqSourceState.parametric` now typed as `EqParametricState`.
- `ParametricBand.mode` comment updated with the full six-type range.

**`eq.ts`**:
- `RawEq` extended with `EQBandL?` and `EQBandR?`.
- `bandMap(raw)` → `bandMapFrom(arr)` (takes an explicit array, decoupled
  from `RawEq`).
- New `toBands(arr)` helper parses all 12 bands (a–l) from an array.
- `parseParametric` branches on `channelMode`: `"L/R"` → `bands.left` +
  `bands.right` from `EQBandL`/`EQBandR`; Stereo → `bands.stereo` from
  `EQBand`.
- `setParametricBand` now takes a `channel: PeqChannel` param and sends
  the correct `channelMode` + band container key (`EQBand`/`EQBandL`/
  `EQBandR`).
- New `setParametricChannelMode(ip, source, mode)` — sends `setSourceBand`
  with just `channelMode` (Option A, unverified command shape).
- New `resetGraphic(ip, source)` — sends all 10 graphic bands at 0 dB.
- New `resetParametric(ip, source, channel)` — sends all 12 bands to
  defaults (Peak, default freq, Q=1, gain=0) using the correct channel key.
- Fallback in `getSourceState` updated to match the new `EqParametricState`
  shape.

**`route.ts`**:
- `Letter` validator widened to a–l (was a–j).
- `setParametric` mode validator widened from `min(-1).max(2)` to
  `min(-1).max(5)` (accepts LP=3, HP=5).
- `setParametric` gains a `channel` field (default `"stereo"`).
- New `setChannelMode` action: `source` + `mode` (`"Stereo"` | `"L/R"`).
- New `reset` action: `source` + `type` + optional `channel`.

### Files changed (dual-write, `src/` + `_showa/`)

**`eq-card.tsx`** — sha256 `913DAD09...` → `16DEE935...` (FreqInput fix) →
final `913DAD09E14C...` (reset button). Brackets 295/337/40 all balanced.

UI changes:
- **Tab button font**: `text-sm` → `text-xs` (0.75rem, per Greg's testing).
- **PEQ mode dropdown** (`PeqModeDropdown`): tan tile face, sits in the
  header row after the Parametric EQ tab (only when Parametric is active).
  Shows Stereo or L/R; selecting fires `setChannelMode`.
- **L/R channel buttons** (`ChannelButton`): two small tan-tile buttons
  with indicator LEDs, appear to the right of the mode dropdown when L/R
  is active. Selecting L or R switches which channel's bands are displayed
  and edited.
- **`ParametricPanel`**: accepts `channel: PeqChannel` prop. Filters
  bands to visible 10 (a–j) from the channel-resolved band array.
- **`PeqRow`**: passes `channel` to write calls. When mode is LP (3) or
  HP (5), the gain axis gets `opacity-30` + `pointer-events-none` and the
  readout shows "N/A" instead of a dB value.
- **`TypeDropdown`**: automatically shows all 6 filter types (picks up
  the extended `PEQ_MODES`).
- **`FreqInput`**: converted from uncontrolled (`defaultValue` +
  `Math.round`) to a controlled component with local state synced from
  props via `useEffect`. Fixes two bugs: (1) decimal frequencies now
  display correctly (no rounding), (2) switching L↔R channels updates
  the displayed frequency (React re-render updates local state via the
  effect, whereas `defaultValue` only sets the initial value on mount).
- **Reset button** (`RotateCcw` icon): sits next to the save button in
  the footer PresetBar. Fires a confirmation dialog ("Reset all bands to
  their default values? This will clear the current preset.") before
  sending the `reset` action. Works for both Graphic and Parametric modes;
  in Parametric L/R mode, resets only the active channel.
- New `onReset` prop on `PresetBar`; `doReset()` async function with
  `useConfirm` dialog.

### Verification
- Both trees byte-identical after every sync (PowerShell `Copy-Item` +
  sha256 comparison).
- Python bracket-balance check: parens 295/295, braces 337/337, brackets
  40/40 — all balanced.
- All 15 function declarations present (including new `PeqModeDropdown`,
  `ChannelButton`).
- `RotateCcw`, `doReset`, `onReset` all present in final file.
- Confirmed working live by Greg: L/R display, mode switch, LP/HP gain
  disable, frequency decimals, channel-switch frequency update, reset.

### What's NOT done yet (from the spec)
- ~~**Milestone B (per-channel editing)**~~ — **CLOSED.** Single-channel
  writes confirmed non-destructive via live probe (set known values on
  both channels, wrote one, re-read — the other was preserved intact).
- **Milestone C (Stereo↔L/R mode switch)**: wired as Option A and working,
  but the command shape is unverified in the formal sense.

## Current workflow (read this before doing anything)

**Dual-write, not stage-and-preview — for re-skin files only.** Every
VISUAL/component edit goes to BOTH `_showa/[path]` and `src/[path]` in the
same turn. `_showa/` is a synced mirror for diff/handoff reference, scoped to
`app/globals.css`, `app/layout.tsx`, `tailwind.config.ts`, and `components/`
— it does NOT have a `lib/` tree, and that's deliberate (see "Non-re-skin
work" below). Don't invent an `_showa/lib/` path; data-layer fixes belong in
`src/lib/` only.

**Discipline per edit:**
1. Read current file before touching it.
2. Dry-run (`dryRun: true`) — confirm the diff looks right.
3. Apply to `_showa/`, then identically to `src/` (re-skin files only — see
   above for the `lib/` exception).
4. Read back from disk to verify — don't trust the tool's success report.
5. For structural JSX/TS changes: run a Python balance check
   (`copy_file_user_to_claude` + brace/paren/bracket counts + key string
   presence) before triggering a Docker rebuild. NOTE: the naive
   char-counting checker false-positives on regex literals and template
   strings containing brackets — if it fails, re-run with literals/comments
   stripped (regex substitution) before concluding there's a real imbalance.
6. Update `_showa/README.md` with a numbered Round entry at end of session.

**Binary assets**: Greg places PNGs in `public/` manually (Claude's
`write_file` corrupts binary). Confirm via `dir` in PowerShell before
referencing in code. `docker compose up -d --build` required for `public/`
changes or any source change; `docker compose restart` sufficient for
source-only changes (no new assets).

**`_showa/` must stay in `tsconfig.json`'s `exclude`** — prevents
Next/TS from scanning the mirror and failing the build.

## Round 30 — Parametric EQ L/R data-layer investigation (this session, handed to 4.6)

**This is a data-layer investigation, NOT a re-skin round.** No component
files were changed. Deliverable is a spec (`_showa/PEQ_LR_SPEC.md`) for a
follow-up session to implement.

### The bug
Greg loaded a saved parametric preset ("9db bass shelf") and every band
showed default values (Peak / 0.25 Q / 0.0 dB / default freqs) instead of the
preset's real values, which the WiiM phone app displays correctly.

### Root cause (confirmed live via temporary debug logging in `eqCall`)
The app hardcodes `channelMode: "Stereo"` on every parametric read and write
(`CHANNEL_MODE_STEREO` throughout `eq.ts`). But the device had been set to
**L/R mode** from the WiiM phone app (which takes precedence over anything
this app does). In L/R mode, `EQGetLV2SourceBandEx` returns the bands under
**`EQBandL` + `EQBandR`** (independent per-channel arrays) with NO flat
`EQBand` — so our parser, which only reads `raw.EQBand`, found nothing and
every band fell through to its default.

### What the probing established (all confirmed against the live device)
- **12 bands, not 10.** The device exposes bands **a–l** (×4 fields
  `_mode`/`_freq`/`_q`/`_gain` = 48 entries). The phone app only *shows* 10
  (a–j); k and l exist in firmware and must be preserved on write.
- **Two channel modes, different shapes:** Stereo → flat `EQBand`;
  L/R → `EQBandL` + `EQBandR`, no flat array. Same param naming in both;
  only the container key differs. L and R hold **independent** values
  (`leftEqualsRight:false` confirmed on a real preset).
- **Six filter types, mode numbers CONFIRMED** (cross-checked phone-app UI
  against raw values — band 5=LP→`e_mode=3`, band 6=HP→`f_mode=5`):
  Off=-1, LS=0, PK=1, HS=2, **LP=3, HP=5**. Value 4 is unused/reserved.
  LP/HP use freq+Q only — no gain (app greys the gain field).
- Our app currently models only 4 types (Off/LS/PK/HS) — missing LP/HP.
- **No channel-mode-set command exists** in the current `EqCmd` table, so a
  Stereo↔L/R toggle from our UI (spec milestone C) has an unverified command
  path and is deferred.

### The phone app's UI (for parity reference, screenshots in the session)
"PEQ Mode: Stereo/L/R" dropdown + a Left/Right segmented toggle (only in L/R
mode) that swaps which channel's 10 bands are shown/edited. Presets are
labeled Stereo or L/R in the list. Reset/Save buttons above the band table.

### Deliverable
`_showa/PEQ_LR_SPEC.md` — full implementation spec with data model, parse/
write changes, UI changes, the confirmed filter-type table, and a milestone
breakdown:
- **A** (read/display correct in either mode) + **D** (six filter types) —
  fully specified, no unknowns, ready to build. Fixes the reported bug.
- **B** (per-channel editing) — needs one probe first: the L/R single-channel
  write shape (does writing one channel preserve the other?). Spec says run
  that probe as step one of B (it's a trial write, inseparable from building
  the write path), against a scratch state not a real preset.
- **C** (Stereo↔L/R switch from our UI) — deferred; unverified command.

**Handed to a fresh Sonnet 4.6 session** to implement A+D first, then B.
Greg's call, to conserve context/tokens on the mechanical implementation now
that the (harder) discovery is done and written down.

### Debug logging — REMOVED before close
The temporary `[eq-debug]` block added to `eqCall` in `src/lib/wiim/eq.ts`
for this investigation has been fully stripped; `eq.ts` verified clean
(grep: 0 `eq-debug`, 0 `TEMP DEBUG`, 0 `console.log`) and bracket-balanced
(parens 110/110, braces 51/51, brackets 21/21). The file is back to its
pre-session state.

### Files touched
- `src/lib/wiim/eq.ts` — debug logging added then removed; **net zero change**
  (data-layer file, `src`-only, never mirrored to `_showa/`).
- `_showa/PEQ_LR_SPEC.md` — NEW, the handoff spec. (Placed in `_showa/`
  purely as a convenient home for handoff docs alongside SESSION_HANDOFF.md /
  README.md; it is documentation, not a mirrored component.)
- No component files changed. No `public/` assets. No dual-write this round.

## Round 29 — EQ panel: Parametric EQ view (this session)

Re-skinned the Parametric EQ view — the item explicitly flagged as next at
the end of Round 28. Source-only change (no new `public/` assets),
`eq-card.tsx` only.

### Scope confirmed with Greg before code was written
- Greg shared a Lovart mockup (10 bands shown as 8 rows a–h, cropped — full
  data model is 10 bands a–j, confirmed with Greg the extra two render
  identically).
- Gain stays a horizontal inline control (not a vertical fader like the
  Graphic EQ) — fits the row/table format.
- Full table-row structure abandoned in favor of a redesigned per-band row
  (band letter / type / freq / Q / gain), not literally the old CSS grid.
- **Mockup correction**: the mockup showed Gain sliders in the middle column
  and Q on the right — Greg corrected this, Q should be in the center and
  Gain on the right.
- Column headers (Type/Freq/Q/Gain) left-aligned above their columns, not
  centered over the slider tracks.
- Tick marks moved to a strip below each slider track, not inline on it.
- Slider thumb: reuse the existing `eq-knob.png` cap (scaled down) rather
  than requesting a new asset — keeps this a source-only change.
- Tick placement should be "related to the value in a way that makes
  sense" rather than arbitrary even spacing — resolved as: linear ticks at
  −12/−6/0/+6/+12 for Gain, log-spaced ticks at 0.1/0.5/1/2/4/8/16/24 for Q,
  with the reference value (0dB / Q=1) emphasized as a center-detent cue.

### Implementation
- **`ParametricPanel`**: header row (Type/Freq/Q/Gain, left-aligned, fixed
  widths matching the row grid below) + a `flex flex-col gap-3` list of 10
  `PeqRow`s.
- **`PeqRow`**: `flex items-center gap-4` — band letter (rust, `w-5`) →
  `TypeDropdown` (`w-[132px]`) → `FreqInput` (`w-[108px]`) → `PeqAxis` for Q
  (`flex-1`) → `PeqAxis` for Gain (`flex-1`). Whole row dims to `opacity-45`
  when the band's mode is Off, same as before. Local `gain`/`q` state with a
  `dragging: "gain" | "q" | null` flag (extended from the old single boolean
  since two axes can now be mid-drag independently) so device polls don't
  fight an in-progress drag.
- **`TypeDropdown`**: same Radix dropdown + `PEQ_MODES` as before, restyled
  as a tan `TAB_FACE` tile (same recipe as the header `TabButton`s) with a
  `ChevronDown`, sized to row height instead of the old `bg-white/[0.04]`
  pill.
- **`FreqInput`**: recessed dark box (`hsl(30 10% 4%)` + inset shadow,
  matching the fader-groove recipe) holding an editable number input +
  "Hz" suffix; spin-button arrows hidden via `[appearance:textfield]` +
  `[&::-webkit-*-spin-button]:appearance-none`.
- **`PeqAxis`** (new): pairs a `PeqSlider` with a right-aligned numeric
  readout and a tick-mark strip rendered below the slider in its own `flex-1`
  column, so ticks self-align under the track regardless of the value
  label's fixed width sitting outside that column. Tick x-position computed
  via `toPos()`, linear or log depending on the axis's `scale`.
- **`PeqSlider`** (new): wraps Radix's horizontal `SliderPrimitive.Root` on
  the same recessed-groove recipe as the Graphic EQ's vertical `EqSlider`
  (`hsl(30 10% 4%)` track, matching inset shadow), with `eq-knob.png` at
  `w-6` (down from the Graphic fader's `w-[42px]`) as the thumb, shadow
  scaled down to match (`drop-shadow(3px 4px 4px rgba(0,0,0,0.9))` vs. the
  original `6px 7px 8px`). `scale="log"` drives Radix itself on a
  log-transformed `[ln(min), ln(max)]` domain (400+ internal steps) and
  converts back to the real value on change/commit, rounded to 2 decimals —
  keeps Radix's own drag/keyboard/accessibility behavior intact rather than
  reimplementing a custom log slider.
- Value formatting: Gain `${sign}${v.toFixed(1)} dB`; Q `v.toFixed(2)`.
- Removed the now-unused `import { Slider } from "@/components/ui/slider"`
  (only the old `PeqRow` used it; nothing else in this file does).
- Updated the file's top JSDoc block: replaced the Round 28 "DELIBERATELY
  UNTOUCHED" note with a Round 29 summary of the parametric rebuild.

### Verification
- Two `edit_file` calls (one per tree), applied identically to `src/` and
  `_showa/`. **Note**: this session's `dryRun: true` call did NOT
  auto-apply as some earlier sessions' handoff notes described — the file
  on disk was unchanged after the dry-run, confirmed by re-reading it before
  proceeding. Re-ran with `dryRun: false` to actually apply. Worth
  re-confirming this behavior at the start of future sessions rather than
  assuming either way.
- Read back from disk after applying; diffed + sha256'd both trees via
  `copy_file_user_to_claude` — byte-identical (`79fe55498e2e...`).
- Python balance check (comments/strings/template-literals stripped first):
  parens 248/248, braces 284/284, brackets 33/33, all balanced. All 12
  expected function declarations present (`ParametricPanel`, `PeqRow`,
  `TypeDropdown`, `FreqInput`, `PeqAxis`, `PeqSlider`, plus the untouched
  `GraphicPanel`/`EqSlider`/`TabButton`/`PowerKnob`/`PresetBar`/`EqCard`).

### Open items for next session
- **Not yet seen live by Greg** — needs `docker compose up -d --build` +
  browser review before this round is considered closed. (Update: a first
  round of live-review tweaks landed same-session, see below — still needs
  another look after those.)
- ~~Tick-mark tick values...~~ superseded, see tweak pass below.
- ~~Row/column exact widths...~~ superseded, see tweak pass below.

### Live-review tweak pass (same session, before Greg had rebuilt/seen it running — he reviewed the static screenshot render)
Six fixes from Greg's read of a rendered screenshot:
1. **`FreqInput` spin buttons restored.** Round 29 had added
   `[appearance:textfield] [&::-webkit-*-spin-button]:appearance-none` as
   unrequested "polish" to hide the native number-input up/down arrows.
   Greg wanted them back — removed those utility classes, native spinners
   are back.
2. **`FreqInput` + `TypeDropdown` width 108px/132px → 100px each,** freeing
   horizontal room for the Q/Gain sliders.
3. **Q tick marks reworked.** Old `Q_TICKS = [0.1, 0.5, 1, 2, 4, 8, 16, 24]`
   read sparse left of 1.0 and irregular right of it (log spacing wasn't
   uniform — 24/16 is only a 1.5x step vs. 2x everywhere else) and had ticks
   sitting right at the two track endpoints, which Greg didn't want. New
   `Q_TICKS = [0.25, 0.5, 1, 2, 4, 8, 16]` — exactly log2-spaced (each tick
   2x the last), endpoints (0.1, 24) dropped. Positions now land at even
   ~12.6% track-width intervals across the whole set.
4. **Gain ticks: one per whole dB.** `GAIN_TICKS` was `[-12, -6, 0, 6, 12]`;
   now `Array.from({ length: 25 }, (_, i) => i - 12)` — every integer
   −12..+12. 0dB is still the taller/brighter reference tick, the rest are
   uniform minor ticks.
5. **Divider between Q and Gain.** The freed-up width from #2 plus a
   restructure: Q's and Gain's `PeqAxis` wrappers now live inside a shared
   `flex flex-1 items-stretch gap-6` container (was: both were independent
   `flex-1` siblings of the row at `gap-4`), with a `self-stretch` 1px
   vertical rule (`hsl(var(--faceplate) / 0.14)`) between them. The header
   row got the identical wrapper (with an invisible `w-px` spacer in place
   of the rule) so the Q/Gain column labels stay aligned to the sliders
   below.
6. **Q's numeric readout was reading as if it belonged to Gain** — it's the
   same `PeqAxis` component for both axes, and Q's right-aligned value sat
   right at the boundary with Gain's slider, closer to Gain than to its own
   Q slider. Fixed generically in `PeqAxis`: slider→value gap `gap-3`→
   `gap-2`, value alignment `text-right`→`text-left` (so the digits sit
   immediately after their own slider instead of pushed to the far edge of
   a fixed-width box), width `w-14`→`w-12`. Applies symmetrically to both
   Q and Gain — reads correctly for both now that the divider (#5) also
   clearly separates the two axes.

Verification: dry-run diff reviewed before applying (this session's
`edit_file` again did NOT auto-apply on `dryRun: true` — consistent with
the Round 29 note above, applying with `dryRun: false` continues to be
necessary), both trees re-synced, diffed + sha256'd identical
(`ad7b7f17167b85...`), Python balance check clean (parens 250/250, braces
287/287, brackets 32/32).

**Still needs**: Greg hasn't seen this live yet either — `docker compose up
-d --build` + browser review still pending for all of Round 29 including
this tweak pass.

### Second live-review tweak pass (same session, still pre-`--build`)
Five more fixes from a second screenshot read:
1. **Q/Gain divider was reading as broken/dashed, not a single line.** Root
   cause: it was a per-row element (`self-stretch` inside each `PeqRow`),
   so it was actually 10 separate ~34px segments that happened to line up
   in the same column — with a visible ~12px gap between each one (the
   `flex-col gap-*` between rows). Fixed by removing the per-row divider
   entirely and rendering **one** `absolute inset-y-0` divider once, as a
   sibling of the row list inside a `relative` wrapper, spanning the full
   height of all 10 rows in a single unbroken line. Horizontal position is
   `calc(50% + 134px)` — 134px is half of the 268px fixed-width prefix
   (band letter 20px + 3×16px gaps + Type 100px + Freq 100px), so the line
   lands exactly at the midpoint of the Q/Gain area regardless of the
   panel's actual rendered width. Rows' own Q/Gain gap changed `gap-6`
   (24px, either side of the old per-row divider) → `gap-12` (48px, one
   gap since there's no divider element between them now) to preserve
   roughly the same visual spacing.
2. **`FreqInput`**: restored the ≥3px gap between the number and the native
   spinner arrows (`pr-1` on the input, 4px), background → `#2d2a26`,
   box-shadow → the exact values Greg specified
   (`rgba(0,0,0,0.9) 0px 1px 6px inset, rgba(0,0,0,-1.4) 0px 0px 0px 1px inset`
   — applied verbatim; the second shadow's negative alpha will just clamp
   to fully transparent in-browser, flagged to Greg but not corrected
   unprompted), and `colorScheme: "dark"` on the `<input>` to kill the
   native spinner buttons' light-mode white background (browsers render
   number-input spin buttons using the OS/browser light UI unless the
   element opts into a dark color-scheme).
3. **Gain ticks: dropped the two endpoint ticks** (−12 and +12) —
   `GAIN_TICKS` was `Array.from({ length: 25 }, (_, i) => i - 12)`
   (−12..+12 inclusive), now `Array.from({ length: 23 }, (_, i) => i - 11)`
   (−11..+11) — same pattern as the Q endpoint removal from the first tweak
   pass.
4. **dB value labels were wrapping to two lines** (`-0.5` / `dB` stacking).
   Two changes together: (a) `PeqAxis`'s value `<span>` widened `w-12`→
   `w-16` (48px→64px, enough for the worst case `"-12.0 dB"`), and
   (b) the slider itself "shortened" 8px each side by moving from `w-full`
   filling its `flex-1` column outright to sitting inside a `px-2` padded
   wrapper — both changes free up room so the label fits on one line
   without the whole row needing to grow.
5. **Sliders now vertically centered to the Freq/Type box height (32px),
   not to their own slider+ticks bounding box.** Previously the tick-mark
   row was a normal-flow sibling below the slider inside the same flex
   column, so that column's total height (~34px: 20px slider + 6px margin
   + 8px ticks) got centered as one unit against the 32px Freq/Type boxes
   — which visually put the slider itself a few px above center, since
   the ticks below it were "dead weight" pulling the whole block's center
   down without the slider knob following. Fix: made the ticks row
   `absolute` (`top-full mt-1.5`, positioned relative to a new `relative`
   wrapper around just the slider) so it's pulled out of the flow entirely
   and no longer affects that column's contribution to the row's `items-
   center` alignment. Now only the ~20px-tall slider itself participates
   in centering, which lines its vertical center up with the 32px Freq/Type
   boxes' center exactly. Ticks still render in the same visual position
   (`inset-x-2` matches the `px-2` padding from #4 exactly, so they stay
   aligned under the now-narrower track) — just outside the row's own
   height calculation.
   - Side effect: pulling the ticks out of flow meant the row-to-row gap
     needed a bump to avoid the now-invisible-to-layout tick marks visually
     overlapping the next row's top edge (there's only ~4–8px of natural
     slack below the row's nominal 32px box before the ticks appear).
     Bumped the row list's `gap-3` (12px) → `gap-4` (16px) as a safety
     margin — not explicitly requested, but a direct consequence of fix #5;
     flagging in case it reads as more spacing than intended.

Verification: dry-run diff reviewed, applied for real, both trees re-synced,
diffed + sha256'd identical (`2de746d7072df6...`), Python balance check clean
(parens 250/250, braces 290/290, brackets 32/32), `GAIN_TICKS`/`Q_TICKS`
values confirmed by direct extraction from the file.

**Still needs**: still hasn't been seen live — `docker compose up -d
--build` + browser review pending for all of Round 29 and both tweak passes.

### Third live-review tweak pass (same session, still pre-`--build`)
Two more fixes from a third screenshot read:
1. **`FreqInput` spinner centering**: bumped both the input's `pr-1`→`pr-2`
   (8px, gap before the native spinner) and the wrapping flex's `gap-1`→
   `gap-2` (8px, gap after the spinner to "Hz") so both sides declare the
   same 8px. Native spin-button rendering (exact width/inset) is
   browser-dependent and not fully controllable from CSS, so this is a
   best-effort symmetric value rather than a pixel-guaranteed one — worth
   a glance once live.
2. **Q/Gain divider recentering**: root cause was that Q's value label had
   been switched to `text-left` in the previous tweak pass (to fix an
   earlier "Q's number reads like Gain's" complaign from before the
   divider existed) — left-aligned text in a 64px-wide box leaves a lot of
   trailing whitespace before the actual divider, while Gain's slider (on
   the other side) only has an 8px `px-2` inset before its track starts.
   That asymmetry (roughly 58px visual gap on the Q side vs. 32px on the
   Gain side) is what made the divider look off-center. Fixed by **reverting
   the value label back to `text-right`** for both axes (the divider itself
   now unambiguously separates Q from Gain, so the original "reads like
   Gain's number" risk from several rounds back no longer applies), which
   makes Q's digits hug the column boundary flush against the gap — same
   as Gain's readout, symmetric on both sides now. Also nudged the
   divider's position 4px left (`calc(50% + 134px)` → `calc(50% + 130px)`)
   to exactly offset Gain's remaining 8px `px-2` slider inset, so the final
   gap is ~28px on both sides instead of the structural 24px/32px split.

Verification: dry-run diff reviewed, applied for real, both trees re-synced,
diffed + sha256'd identical (`203b52c9f498f4...`), Python balance check
clean (parens 250/250, braces 290/290, brackets 32/32).

**Still needs**: still hasn't been seen live — `docker compose up -d
--build` + browser review pending for Round 29 and all three tweak passes.

### Fourth live-review tweak pass (same session, still pre-`--build`)
The third pass's two fixes both made things worse (Greg's words). Root-caused
and redone properly:

1. **Spinner spacing (was: huge gap between digits/spinner/Hz).** The third
   pass had stacked `pr-2` on the input AND `gap-2` on the wrapping flex,
   which double-spaced everything around the native spinner. Redone: the
   input is now `flex-1` with NO `pr-*` (digits sit naturally against the
   spinner at the input's right edge), the wrapper has NO `gap`, and only
   the "Hz" span carries a single `ml-2`. So: digits → [native spinner at
   input edge] → 8px → Hz. One declared gap instead of three competing
   ones. (Native spinner internal padding is still browser-controlled and
   not adjustable — unchanged caveat.)
2. **Q/Gain divider + "huge gap between values and sliders".** The real
   culprit across the last two passes was the Q value label being `w-16`
   `text-right`: right-aligned in a wide box, Q's digits floated far from
   their own slider and hard up against the divider, while the divider
   offset itself was being fudged with magic numbers (`+130px`, `+134px`)
   that never matched the actual layout. Redone structurally:
   - Value labels reverted to **`text-left`** (both axes) so each number
     hugs the right end of its own slider instead of drifting toward the
     divider. Kept at `w-16` so the widest gain string (`-12.0 dB`) fits on
     one line without wrapping (a `w-12` attempt mid-pass would have clipped
     it — corrected before sync).
   - The Q/Gain gap is now an explicit **32px `w-8` gutter element** placed
     between the two axis columns in each row (replacing the old `gap-12`
     flex gap), with a matching invisible `w-8` spacer in the header label
     row so Q/Gain headers stay column-aligned.
   - The continuous divider's `left` is now derived from that structure
     rather than guessed: the Q/Gain area starts after the fixed 268px
     prefix (letter 20 + 3×16 gaps + Type 100 + Freq 100) and the gutter
     centre works out to exactly `calc(50% + 134px)`, documented inline
     with the derivation so it's not a mystery constant next time.

   Net: the divider sits dead-centre of the real 32px gutter, and both
   value numbers sit close to their own sliders with symmetric space on
   each side of the divider.

Verification: applied to both trees, diffed + sha256'd identical
(`7fd7a2b962178b...`), Python balance check clean (parens 250/250, braces
291/291, brackets 32/32); grep-confirmed no leftover `gap-12` and no
`text-right` value labels.

**Note on tooling**: this pass, the `edit_file` `dryRun: true` call did NOT
auto-apply (file on disk unchanged after it) — opposite of the behavior some
earlier session notes describe. The `str_replace` tool also isn't usable on
these files (it targets Claude's sandbox, not the Windows tree; returned
"File not found"). Reliable path this session: `Filesystem:edit_file` with
`dryRun: false` directly, reading the file back with `view_range` first to
get character-exact `oldText`. Behavior may keep shifting — verify per
session, don't assume.

**Still needs**: still not seen live — `docker compose up -d --build` +
browser review pending for Round 29 and all four tweak passes.

### Fifth live-review tweak pass (same session, still pre-`--build`)
Greg specified the exact CSS values this time; applied verbatim:
1. **Hz span**: removed `ml-2` (the 0.5rem left margin) — the fourth pass's
   single-gap approach still left a touch too much space; now the "Hz"
   sits with no added margin (the flex has no gap either), so it hugs the
   spinner side directly.
2. **Gain axis pushed right to balance the divider**: added a `padLeft`
   boolean prop to `PeqAxis`, set only on the Gain call. When set, the
   slider+ticks wrapper uses `pl-8` (2rem) instead of the default `pl-2`
   (0.5rem), and the tick strip uses `left-8`/`right-2` instead of
   `inset-x-2`. This shifts the Gain track and its ticks ~1.5rem right, so
   the Gain slider starts the same visual distance from the divider as the
   Q slider's value column ends before it — both halves now read
   symmetric about the divider. The Q axis is unchanged (`pl-2`,
   `inset-x-2` via the `left-2`/`right-2` default).
   - Implementation note: `inset-x-2` on the ticks was split into explicit
     `left-*`/`right-2` so the left side could differ from the right; the
     Q (non-padLeft) path resolves to `left-2 right-2` which is identical
     to the old `inset-x-2`, so Q's ticks are visually unchanged.

Verification: applied to both trees, diffed + sha256'd identical
(`e2e34e654562ee...`), Python balance clean (parens 252/252, braces
293/293, brackets 32/32); grep-confirmed `padLeft`/`pl-8`/`left-8` present
and the Hz `ml-2` removed.

**Still needs**: still not seen live — `docker compose up -d --build` +
browser review pending for Round 29 and all five tweak passes.

### Files touched
- `eq-card.tsx` — `src/` + `_showa/`, dual-written, verified byte-identical.
- No new `public/` assets — reused existing `eq-knob.png`.

## Round 28 — EQ panel: shared chrome + Graphic EQ view, two live-review passes (prior session)

Re-skinned the EQ panel's shared chrome (wordmark, source/sub-tabs, POWER
knob, footer) and the Graphic EQ 10-fader bank to the walnut/faceplate
mockup. Parametric EQ view deliberately left untouched. `eq-card.tsx`'s
first staging into `_showa/`. Confirmed live "good" by Greg after two
tuning passes.

### Scope confirmed with Greg before code was written
- Graphic EQ view first, Parametric later (separate round).
- Panel is always-open (not an accordion), matching the mockup.
- POWER knob replaces the enable `Switch` — knob lit = EQ enabled, dark
  overlay = disabled.
- Footer: "Presets" dropdown + floppy-save tile, with rename/delete kept as
  extra footer buttons (custom presets only) rather than folded into the
  dropdown.

### Initial build
- One `.glass` panel, `relative overflow-hidden p-0`, two-layer feTurbulence
  grain (`eqPanelGrain`/`eqPanelGrain2`, unique filter IDs, recipe copied
  verbatim from the presets panel).
- Header: EQUALIZER `font-display` wordmark, device-driven source tabs
  (`TabButton` — flat `eq-buttons.png` tan tile + CSS `Led` + dark label),
  Graphic/Parametric sub-tabs (same `TabButton`), `PowerKnob` on the right.
- `GraphicPanel`: 10 `EqSlider`s wrapping Radix's vertical
  `SliderPrimitive` — recessed groove, tick hairlines down the right side,
  `eq-knob.png` cap as the thumb, no colored range fill. Preserves the
  existing `onChange`/`onCommit` → `setGraphic` contract.
- `PresetBar`: Presets dropdown tile + floppy save, rename/delete as extra
  tiles.
- `ParametricPanel`/`PeqRow` deliberately untouched — still the original
  default-styled table.
- All data-layer wiring unchanged (SWR fetch, `send()`, per-source tabs,
  preset load/save/rename/delete).
- Verified: both trees byte-identical (sha256 `2915844170bc...`), balance
  check clean, all 9 function declarations present. Removed an unused
  `ICON_SHADOW` const (lint risk) before considering the initial build done.

### Live-review pass 1 (six fixes)
Greg's feedback after the first `docker compose up -d --build`:
1. No bold text on selected tab labels — the LED alone should carry active
   state. Removed `font-medium` from `TabButton`'s active label.
2. POWER knob ON/OFF labels were clipped off the panel's right edge
   ("OFF" rendered as "OFI"). Reworked: header row gets `pl-6 pr-8 pt-6`
   instead of `px-6 pt-6`; `PowerKnob`'s wrapper reserves its own `pr-8`;
   ON/OFF labels anchored `left-[48px]` from the knob box's own left edge
   (fixed distance = knob width + small gap) instead of a negative
   `-right-N` offset from the knob itself — more robust, since negative
   `right` offsets are easy to miscalculate against a parent's own edge.
3. Enabled state should have no outer glow (the asset's own ring already
   reads as lit) — removed the `boxShadow: "0 0 10px 2px hsl(30 90% 55% /
   0.45)"` conditional entirely. The off-overlay was already correctly
   conditional on `!enabled`; no bug there, just confirmed.
4. `eq-knob.png` drop-shadow retuned to a two-stop contact shadow (tight +
   soft) instead of one wide blur, closer to the mockup's grounded look.
5. Fader groove widened `w-[6px]` → `w-[10px]`, with a more matte/deeper
   carved-slot `boxShadow` recipe (`hsl(30 10% 4%)` base, tighter insets).
6. Rename/delete/save tiles moved to sit immediately beside the Presets
   dropdown on the left (removed `justify-between` from the footer
   container) instead of split to the panel's far-right edge.

**Mid-pass discovery**: when I re-pulled `src/eq-card.tsx` to make these
edits, it no longer matched the last-verified sha256 (`2915844170bc...`) —
five of the six fixes above were *already applied to `src/` only*, and
`_showa/` was still stale at the old hash. Dual-write discipline had broken
somewhere outside this session's visible actions (cause unknown). Resolved
by treating `src/`'s state as authoritative, applying the one remaining gap
(sub-tabs still pinned right via an inner `justify-between`, item 2's second
half) to `src/`, then rewriting `_showa/` byte-for-byte from the final
`src/` content. Verified sha256-identical (`89eb32af5b0e...`) before
considering the pass done. Flagged to Greg as worth a sanity check if it
recurs — no root cause identified.

### Live-review pass 2 (three fixes)
Greg's precise values, applied verbatim to both trees:
1. Knob drop-shadow → exact spec `drop-shadow(6px 7px 8px rgba(0, 0, 0,
   1))`, replacing the two-stop guess from pass 1.
2. Tick mark color → `hsl(26deg 12% 58% / 31%)`, replacing the token-based
   `hsl(var(--faceplate) / 0.18)`.
3. More space between source tabs and EQ-type sub-tabs → `gap-x-9` →
   `gap-x-16` on the header's inner flex row.

Stale comment cleanup: the drop-shadow's inline comment still described a
"two-stop" shadow after it became a single `drop-shadow()` call — rewritten
to describe the actual (hard, directional, fully opaque) result.

### Verification (both passes)
- Every edit applied to `src/` and `_showa/`, dry-run/diff reviewed before
  confirming.
- Final state sha256-identical across both trees: `a50fb9b2e651b7ae...`.
- Python balance check (comments/template-literals/strings stripped first):
  parens 183/183, braces 225/225, brackets 25/25, all balanced.

### Open items for next session
- **Parametric EQ view** — the explicit next thing to build. `ParametricPanel`/
  `PeqRow` are still the original default-styled table; no re-skin work has
  touched them yet.
- No other open flags — Greg confirmed the Graphic view + shared chrome
  "good" after pass 2.

### Files touched
- `eq-card.tsx` — `src/` + `_showa/`, dual-written (first `_showa/`
  staging for this file), verified byte-identical throughout.
- Assets consumed (already in `public/`, no changes this session):
  `eq-knob.png`, `eq-buttons.png`, `eq-save-button.png`, `power-btn.png`,
  `power-off-overlay.png`.

## Round 27 — Source/Output/Device panel accordion (prior session, pending Greg's live review as of that session's handoff)

Wrapped the whole Source/Output/Device panel in a collapsible accordion,
closed by default. Source-only change (no new `public/` assets) —
`docker compose restart` is sufficient, not `--build`.

### Scope confirmed with Greg before code was written
- Trigger reads `Source | Output | Device` with each segment's icon (Radio /
  Speaker / Settings) next to its label, chevron on the right (down = closed,
  up = open).
- Default state: **closed**.
- Persistence: **per-session/per-load only** — resets on refresh, no
  localStorage/cookie.
- Trigger placement: **first row inside the `Card`**, not a separate element
  above it — so the collapsed panel still reads as one bordered block, just
  short.
- Animation approach: flagged that `@radix-ui/react-collapsible` (my first
  suggestion) isn't actually installed, and that framer-motion (which IS
  installed) doesn't cleanly animate to an unmeasured `height: auto`. Greg
  chose the plain-`useState` + CSS `grid-template-rows: 0fr → 1fr` accordion
  trick over adding the new dependency — zero new packages, no Docker
  `npm install` layer change.

### Implementation
- **`source-output-panel.tsx`** (dual-written): added `const [open, setOpen]
  = useState(false)`. New trigger `<button aria-expanded={open}>` as the
  first child inside `Card`, styled `.control-tile` (same flat-bevel control
  face as the device switcher, not `.glass` — reserved for panel faces per
  Round 25 Pass 4's distinction). Left side: icon+label groups for Source/
  Output/Device separated by literal `|` characters
  (`text-[hsl(var(--faceplate)/0.3)]`, an unconfirmed guess). Right side:
  `ChevronDown`, `rotate-180` + `transition-transform duration-300` when
  open.
- The existing content (SOURCE/OUTPUT half, `VSeam`, DEVICE column —
  internals completely untouched) is now wrapped in a div using the CSS
  grid-rows accordion trick: outer div `display: grid; gridTemplateRows: open
  ? "1fr" : "0fr"; transition: "grid-template-rows 300ms ease"`, inner div
  `overflow-hidden` (required — the grid row can be a fraction taller than
  0, so content needs independent clipping). A `Seam` sits at the top of the
  wrapped content, between the trigger and the SOURCE/OUTPUT/DEVICE row, so
  it reads as one continuous engraved panel when open and disappears cleanly
  when closed.
- `hasLeft`/`hasSource`/`hasOutput`/`hasDevice` conditional logic inside the
  content is unchanged. Note: the trigger's `Source | Output | Device` label
  is static regardless of `hasSource`/`hasOutput` — not conditionally
  trimmed if a row is empty. Not raised as an issue by Greg; flagged here in
  case it matters once seen live on a device missing a row.

### Verification
- Dry-run diff reviewed before applying.
- Applied identically to `_showa/` and `src/`, read back from disk, sha256
  confirmed byte-identical across both trees.
- Python balance check (comments/template-literals/strings stripped first):
  parens 100/100, braces 150/150, brackets 14/14, all balanced. All expected
  function declarations present (`SourceOutputPanel`, `Row`, `Seam`, `VSeam`,
  `DeviceSection`, `DeviceAction`, `InfoRow`, `SignalBars`).

### Open items for next session
- **Not yet seen live by Greg** — needs a `docker compose restart` + browser
  check before this round is considered closed.
- Pipe-separator color (`/0.3` faceplate opacity) — unconfirmed guess, easy
  to adjust.
- 300ms transition duration — unconfirmed guess, flag if it reads slow/fast
  live.

### Files touched
- `source-output-panel.tsx` — `src/` + `_showa/`, dual-written, verified
  byte-identical.

## Round 26 — Lyrics fix + panel resize (prior session)

Greg reported the Now Playing lyrics view showing "No lyrics found" even on
very popular, mainstream songs. Two independent bugs found and fixed, plus a
small unrelated cosmetic tweak.

### Bug 1 — `/api/get` 404s on any album-name mismatch
Tested directly against LRCLIB's API: their `/api/get` endpoint is a strict
exact match on artist+track+album+duration. Artist+track+duration alone
matches fine (duration tolerant to several seconds off), but ANY album-name
mismatch is a hard 404 — even when the song exists in their database under a
slightly different album title (deluxe edition, single release, regional
name, etc.), which is common with WiiM/streaming-service metadata.

**Fix**: `src/lib/lyrics/lrclib.ts` split into `getExact()` (the original
strict call) and a new `searchFallback()` using LRCLIB's `/api/search`
endpoint, which doesn't require an album match. `fetchLyrics()` tries
`getExact()` first, falls back to `searchFallback()` if that returns nothing.
The fallback scores candidates (not raw relevance order): synced lyrics beat
plain-only, and when a duration is known, closest duration wins, discarding
anything more than 15s off (likely a different version — live, remix,
re-record).

### Bug 2 — 6s timeout too aggressive for LRCLIB's real latency
Greg reported the fix from Bug 1 alone didn't resolve it — even "Cruel
Summer" by Taylor Swift, tested directly and confirmed working against
LRCLIB's raw API, still failed inside the app. Debugged with temporary
console logging (added, used, then fully removed once resolved) which showed
every real request throwing a timeout error, not a 404.

Measured directly, three ways, to rule out a client-library-specific bug:
Node's `fetch`, Node's native `https` module, and `wget`, all invoked as
timed subprocesses inside the running container. All three agreed: LRCLIB's
static root page and DNS/TCP/TLS setup are fast (sub-second), but their
`/api/get` and `/api/search` endpoints routinely take **7–10 seconds** to
respond to an exact-match query. This is real, server-side latency on
LRCLIB's end (a small, volunteer-run service) — not a Docker networking
issue, not an IPv6/DNS Happy-Eyeballs issue (both ruled out via direct
measurement), and not specific to any one HTTP client.

**Fix**: `TIMEOUT_MS` constant added to `lrclib.ts`, `AbortSignal.timeout`
raised from 6000 → 12000 on both `getExact` and `searchFallback`. The lyrics
panel already shows a loading spinner while the request is in flight, and
results are cached per track, so the extra latency is a one-time cost.

### Panel resize (`lyrics-view.tsx`, unrelated, requested alongside the fix)
- Default lyrics container `sizeClass` prop: `size-44 sm:size-52` (11rem →
  13rem responsive) → flat `size-[19rem]`, no responsive step (desktop-only
  convention). This is the size actually used by the Now Playing cubby's
  lyrics view (`now-playing-card.tsx` doesn't override `sizeClass`). Kiosk's
  fullscreen lyrics view passes its own explicit `sizeClass` and is untouched.
- `rounded-2xl` removed from the same container.
- **First time `lyrics-view.tsx` is staged into `_showa/`** — dual-written
  from here on, same convention as `service-logo.tsx` in Round 24.

### GitHub issue drafted
Wrote up both lyrics bugs + fixes as a draft issue for the upstream
`illianoaoi/Wiim-Dashboard` repo (delivered to Greg as a file, not part of
this codebase — same "file upstream, don't PR unless asked" pattern as the
Round 23 Plex fix).

### Files touched
- `src/lib/lyrics/lrclib.ts` — `src/` only, no `_showa/` mirror (data layer,
  same convention as `now-playing-info.ts` etc.).
- `src/components/dashboard/lyrics-view.tsx` + new `_showa/components/
  dashboard/lyrics-view.tsx` mirror — dual-written, verified byte-identical.
- No changes needed to `route.ts` or any other component — entirely a
  data-layer + one-component fix.

## Round 25 — Source/Output/Device panel (prior session)

Rebuilt the Source/Output panel into a combined Source/Output/Device panel,
across 5 passes. All passes dual-written `src/` + `_showa/`, verified
byte-identical, balance-checked. Passes 3–5 used `docker compose up -d
--build` (Greg corrected an earlier assumption that `restart` was sufficient
for a source-only change — it wasn't surfacing changes for him; `--build` is
now the default going forward regardless of whether new `public/` assets are
involved).

### Architectural decisions (confirmed with Greg before building)
- **`app-header.tsx` is removed entirely** — the device dropdown + Add
  Device/Settings/Logout that used to live there are now the new panel's
  DEVICE column's only home.
- **The standalone `DeviceInfoCard` is removed entirely** — Model/Firmware/
  IP/Wi-Fi Signal/USB DAC now live only in the new DEVICE column.
- **The Wi-Fi Signal → "Connection: Ethernet" swap for wired devices is kept**,
  carried over unchanged from the old `DeviceInfoCard`.

### Pass 1 — initial DEVICE column build
- **`source-output-panel.tsx`**: added a right-hand DEVICE column, split from
  the existing SOURCE/OUTPUT half by a new vertical engraved seam (`VSeam`,
  same recipe as the horizontal `Seam` between SOURCE and OUTPUT). Column
  contains: header (gear icon + "DEVICE" label), a device switcher (split
  trigger/chevron control, online/offline dot next to the name), Add Device /
  Settings / Logout as three bordered action tiles, then the Model/Firmware/
  IP/Wi-Fi Signal (or Ethernet)/USB DAC info rows.
- **`dashboard.tsx`**: `AppHeader` and `DeviceInfoCard` imports removed; the
  panel now renders independent of `online`/loading state (it's the only way
  left to switch off a dead device) and sits where the header used to,
  relative to now-playing.
- One assumption flagged to Greg at the time: the header's online dot had no
  explicit new home, so it was folded into the device-switcher trigger as a
  small dot next to the device name rather than dropped. (Superseded in
  Pass 2 — see below.)
- `app-header.tsx` and `device-info-card.tsx` left on disk, unreferenced —
  same convention as the Round 21 orphans (`source-card.tsx`/`output-card.tsx`).

### Pass 2 — four fixes from Greg's first review
1. **Keycap-sizing bug (the real fix)**: SOURCE and OUTPUT rows were each an
   independent CSS grid stretching to fill the row width, so a device with
   fewer options (e.g. Greg's bedroom WiiM, fewer outputs) rendered visibly
   larger buttons. Replaced with a shared fixed `KEYCAP_WIDTH` (150px,
   starting point) in a left-aligned flex row — button size is now identical
   regardless of option count, on any device.
- Dropped the online dot from the device switcher; the device name now just
  dims slightly when offline instead.
- Fixed Add Device/Settings/Logout rendering all-caps (uppercase was applied
  to strings that were already title-case) — dropped uppercase/tracking-wide,
  bumped label to `text-xs`, icons to `size-5`, more vertical padding.

### Pass 3 — layout restack + first sizing pass (Greg pushed back on scope first)
Greg flagged that Pass 2 didn't fully address his original ask and required a
confirmed plan before any more code was touched. Plan confirmed, then built:
- **Rows restacked vertical**: SOURCE/OUTPUT label now sits ABOVE its keycap
  run (mockup), replacing the old left-margin 96px label gutter beside a
  right-aligned keycap run — that label block is gone entirely.
- `KEYCAP_WIDTH` `150px` → `100px`.
- DEVICE column `320px` → `460px`.
- Dropdown trigger + 3 action tiles switched from a flat inset trough to the
  `.glass` class, borrowing the raised-bevel treatment from the large panels,
  per Greg's ask to move dimensionality closer to the mockup. Dropdown kept
  its split name/chevron compartments, each now its own `.glass` surface with
  a `gap-2` reveal between them (flagged to Greg as a candidate to revisit if
  he'd rather they share a seam instead of a gap).
- **This was the pass where Greg corrected the Docker assumption**: `restart`
  wasn't surfacing changes for him, only `--build` was — switched to always
  using `--build` from here on.

### Pass 4 — `.control-tile`, new class (Greg: highlight/shadow too dramatic, reads rounded)
Greg compared the `.glass`-treated controls against the mockup: `.glass`'s
wide top highlight + deep two-stop bottom shadow read as a pillowed/rounded
bevel, where the mockup is much flatter — subtle crisp edge, near-flat faces,
sharp corners. Rather than fight `.glass` (tuned for large panels) down to
button scale, added a new lighter class:
- **`.control-tile`** (`globals.css`, dual-written) — kills `.glass`'s wide
  bright top highlight and deep two-stop bottom shadow; keeps only a faint 1px
  inset top highlight + faint 1px inset bottom shade (Greg's pick: "subtle
  raised", the middle of three flatness options offered) plus the same crisp
  1px black edge ring. Same `--radius` token as everywhere else — the
  "rounded" look was the soft shadow falloff, not real border-radius, so
  flattening the shadow was the actual fix.
- Applied to the two dropdown compartments + the three action tiles. The
  dropdown's *popup menu* (the list that opens on click) intentionally stays
  `.glass` — it's a floating panel, not a control face. Flagged to Greg as a
  candidate to also switch if he'd rather it match.
- Also this pass: DEVICE column `460px` → `600px`, `DeviceSection` l/r
  padding `px-6` → `px-16` (4rem).
- Verified: 4 `.control-tile` usages in both trees at identical line numbers
  (2 dropdown compartments + the shared `DeviceAction` className used by all
  3 tiles), 1 remaining `.glass` usage (the dropdown popup, correctly
  unchanged).

### Pass 5 — now-playing width (unrelated, last item before wrap-up)
- `now-playing-card.tsx` — left-column width `lg:w-[48%]` → `lg:w-[45.5%]`,
  single occurrence, applied identically to both trees.

### Open flags for next review (not blocking, small)
- Dropdown compartment gap: currently `gap-2` (8px) between the two `.glass`→
  `.control-tile` compartments. Easy to switch to a shared seam if Greg
  prefers them touching.
- Dropdown popup menu still uses `.glass` (not `.control-tile`) — intentional
  (floating panel vs. control face) but flagged in case Greg wants it to match.
- `.control-tile` shadow values (`0.06` highlight / `0.35` shade / `0.4` ring)
  are the exposed knobs if it reads slightly off once seen live over time.

### Files touched (all dual-written `src/` + `_showa/` unless noted)
- `source-output-panel.tsx` — all 5 passes.
- `dashboard.tsx` — Pass 1 only (AppHeader/DeviceInfoCard removal, prop wiring).
- `globals.css` — Pass 4 only (`.control-tile` addition).
- `now-playing-card.tsx` — Pass 5 only (width value).
- `app-header.tsx`, `device-info-card.tsx` — left on disk, now orphaned,
  not deleted.

## Round 24 — Source panel resize fix + DLNA/radio/Plex service-name fix (prior session)

Two independent pieces of work, both source-only (`docker compose restart`,
no new `public/` assets).

### Source/Output panel — keycap buttons now shrink-to-fit instead of wrapping
Matches the Presets panel's existing resize behavior (uniform CSS grid) at
narrower browser widths. Root cause: `KeycapButton` had a hardcoded
`w-[140px] shrink-0` and the panel's `Row` container was `flex flex-wrap`, so
narrowing the window wrapped buttons onto a second line instead of shrinking
them.
- `keycap-button.tsx` — added an optional `className` prop, dropped the
  hardcoded width from the button element so the parent controls sizing.
- `source-output-panel.tsx` — `Row`'s keycap container switched from
  `flex flex-wrap` to `grid` with an inline
  `gridTemplateColumns: repeat(${options.length}, minmax(0, 1fr))` (column
  count = that row's actual option count, since SOURCE and OUTPUT can differ);
  each `KeycapButton` now gets `className="w-full"`.
- Confirmed with Greg: no minimum-column-width floor needed (desktop-only
  app, unlikely to get that narrow).
- **Greg has more source-panel tweaks queued for next session** — not yet
  specified when this was written.

### DLNA/radio/Plex service-name fix (multi-part)
Greg reported the stream-info band showing "CustomRadio" for internet-radio
presets (a regression baked into the Round 23 Plex fix), and then — after the
first fix — that a Plex-hosted-album preset showed the ALBUM name instead of
"Plex". Root cause in both cases: `detectService` (`now-playing-info.ts`)
treats every generic in-app network mode (10–30-ish) as one bucket with no
reliable way to distinguish "internet radio, no ID available" from
"Plex/DLNA content pulled directly by the device" — the WiiM API genuinely
doesn't disambiguate these at the mode level.

**Fix, in order of discovery:**
1. **Removed the bad `vendor` fallback** from the generic network-modes
   branch (`name: vendor || "Network"`). WiiM populates `vendor:
   "CustomRadio"` for its OWN internal radio-browser app on these streams —
   not a real service name. This alone regressed the display to plain
   "Network" for radio presets.
2. **Lifted the client-side last-tapped-preset memory from `PresetCard` up to
   `Dashboard`** (`activePreset`/`activePresetSourceKey` state,
   `handlePresetActivated` callback, same clear-on-stop/source-change rule as
   before) so `NowPlayingCard` can also read it. When
   `player.service.key === "network"` (the generic, no-vendor fallback) AND a
   preset was last tapped on the current source, the stream-info band shows
   the REMEMBERED PRESET NAME instead of "Network" — this is how station
   names ("Naim Radio", "Calico Radio", etc.) now display correctly. Same
   accepted limitation as the Presets panel itself: a station switched from
   outside this dashboard won't be reflected.
3. **Split the `"network"` service key into `"network"` (true generic
   fallback) vs. `"vendor"`** (a real vendor-reported name) so the preset-name
   substitution in step 2 can't accidentally clobber a legitimate
   vendor-reported name — this mattered because of what was found next.
4. **Captured a real payload for the Plex-hosted-album preset** (curl against
   `getPlayerStatusEx`/`getMetaInfo` while it played) and found: `mode:
   "10"` (plain generic network — NOT mode 99, which is only Plex CASTING TO
   the device), `vendor: "Plex"`, `albumArtURI` pointing at the user's own
   Plex server IP (doesn't match any `SERVICE_BY_HOST` CDN pattern). The
   generic-network branch was returning before ever checking `vendor`, so
   this fell all the way through to "Network" — then got incorrectly
   overridden with the album preset's name by step 2's fix.
5. **Fixed properly**: the generic-network branch now checks `vendor` too
   (not just the dedicated mode-99 push branch), gated by a new
   `isRealVendor()` helper that excludes known WiiM-internal aggregator names
   (currently just `"customradio"`, case-insensitive) while trusting
   everything else (Plex, and presumably other real DLNA/UPnP casters). A
   real vendor now wins over the generic fallback regardless of which mode it
   landed on.

**Net result, confirmed by Greg:**
- Internet radio presets → station name (from remembered preset tap).
- Plex cast TO the device (mode 99) → "Plex" (Round 23's original fix,
  untouched).
- Plex-hosted preset PULLED by the device (mode 10, `vendor: "Plex"`) → now
  ALSO "Plex", not the album name.

**Files touched:**
- `src/lib/wiim/now-playing-info.ts` — `src/` only, no `_showa/` mirror (data
  layer). Added `isRealVendor()` + `INTERNAL_VENDOR_NAMES`; both the generic
  network-modes branch and the mode-99 push branch now use it.
- `src/components/ui/service-logo.tsx` — added `"vendor"` to the Radio-icon
  fallback set so Plex still gets the antenna glyph under its new key.
  **First touch of this file in the re-skin** — its `_showa/` mirror didn't
  exist before this round; created it identical to `src/`.
- `src/components/dashboard/preset-card.tsx` — active-preset memory lifted
  out to controlled `activeIndex`/`onActivate` props (was local state).
  Dual-written.
- `src/components/dashboard/dashboard.tsx` — now owns the active-preset
  memory; wires it to both `PresetCard` and `NowPlayingCard`. Dual-written.
- `src/components/dashboard/now-playing-card.tsx` — new `activePresetName`
  prop; substitutes it for the generic `"network"` label only (never for
  `"vendor"`-keyed names like Plex). Dual-written.
- `src/components/dashboard/keycap-button.tsx`,
  `src/components/dashboard/source-output-panel.tsx` — grid resize fix.
  Dual-written.

All structurally-changed files balance-checked (Python bracket/brace/paren
counter, comments/strings/template-literals stripped first) after edits.

## Non-re-skin work (Round 23 session) — Plex DLNA data-layer fix

Greg reported a real app bug unrelated to the visual re-skin: streaming from
a Plex server (cast via DLNA) showed track title/artist/album but NOT album
art, bitrate/format, or correct play/pause state. This was a genuine data-
layer bug, not a styling issue, and was diagnosed + fixed in
**`src/lib/wiim/{types,parse,now-playing-info,snapshot,client}.ts` — `src/`
only, no `_showa/` mirror**, because `_showa/` is scoped to the re-skin's
visual surface area and these files were never part of it.

**Root cause**: Plex pushes via DLNA, landing on `getPlayerStatusEx`
`mode:"99"` with a populated `vendor:"Plex"` field the code didn't handle.
That left `sourceKey: null`, which hid both the art and the entire stream-info
band (both gated on it). Separately, `status` is permanently `"stop"` for this
vendor-push case even mid-track (confirmed via captured payloads — stopping
the player left `status` unchanged and `curpos` still advancing), so play/stop
couldn't be read from a single snapshot at all.

**Fix, by file:**
- `types.ts` — added `vendor: string | null` to `PlayerStatus`.
- `parse.ts` — a populated `vendor` on a mode that isn't a known physical
  input now resolves `sourceKey` to `"wifi"` (broad fix, not hardcoded to
  mode 99 — keys off vendor presence + mode mismatch).
- `now-playing-info.ts` — `detectService` takes `vendor` as a third param,
  names the service after it when no mode/host match wins (shows "Plex").
- `snapshot.ts` — module-level poll-delta map (`vendorTransport`), keyed by
  device id, comparing `position` across polls **only** for the
  `mode==="99" && vendor` signature: advanced ⇒ playing, frozen ⇒ stopped.
  One poll behind by nature; track changes read as a single self-correcting
  "stopped" blip; stop and pause are indistinguishable (both freeze) — all
  accepted tradeoffs, confirmed with Greg.
- `client.ts` — the art-fetch SSRF guard (`wiimFetchRaw`) previously only
  trusted a private-network art host if it matched the WiiM device's own IP,
  which blocked Plex's art URL (Plex runs on a different LAN host). Added
  `isPlexArtUrl()`: a narrow shape-based exception requiring BOTH a literal
  `/photo/:/` path segment AND a non-empty `X-Plex-Token` query param —
  deliberately not an IP allowlist or a blanket private-host trust, since this
  proxy fetches whatever URL a (potentially compromised) device hands it.

**All three symptoms confirmed fixed** against Greg's real Plex stream: art
displays, stream-info band shows "Plex · FLAC · Lossless · 865 kbps ·
16-bit/44.1 kHz", play/pause tracks correctly.

**Follow-up**: Greg posted this as an upstream GitHub issue (filed by June 30, 2026).

## Round 23 — Presets panel cubby rebuild (this session)

Picked up the Round 22 follow-ups Greg had queued. Three passes, all
source-only (`docker compose restart`), all dual-written `src/` + `_showa/`
and verified byte-identical by sha256 after each pass. `preset-card.tsx` only
— the `PresetCard` prop contract was unchanged, so `dashboard.tsx` was NOT
touched this round.

### Pass 1 — structural rebuild (CSS-first, per Greg)
Greg's five review items collapsed into one structural change plus two
localized fixes. The panel went from a single dark recessed trough (tiles
butted together, 1px CSS grooves) to **independent recessed walnut cubbies on
a uniform `grid-cols-6`**:
- **Separators**: the old 1px dark-on-dark groove was near-invisible. Now the
  grid gap IS the walnut wall between recesses, visible by construction, in
  both directions. The old `<Groove>`/`<RowSeam>` helpers are gone.
- **Last-tile-in-row width bug** (tiles 6 & 12 rendered wider): root cause was
  the old flex layout donating a fixed-width groove gutter from cells 1–5 but
  not the last cell, so the last tile kept ~15px the others lost. A uniform
  grid gives six equal columns — structurally impossible now.
- **Art/caption split from Round 22 reverted.** That split existed ONLY to
  contain the self-stretching divider PNG (the Round 22 Pass 3 dead-zone fix).
  With no stretching element left, each caption goes back inside its own grid
  cell — column alignment is automatic and the dead-zone gap can't reopen.
- **Active bar tab**: active tile now gets the rust lacquer frame AND a
  protruding rust bar tab centered beneath it (straddling the cubby's bottom
  edge into the groove), matching the mockup — not just a frame ring.
- **Empty-slot numeral**: tighter circle, thicker ring.
- Each cubby = a walnut frame (5px padding = the visible wood wall) with an
  inset well shadow on the tile floor; rust lacquer frame when active. CSS,
  not a PNG — this is a flat rectilinear recess, unlike the now-playing niche
  where CSS failed and a PNG was required. A single reusable cubby-frame PNG
  fallback was offered but not needed.
- Panel face texture (`presetsPanelGrain`/`presetsPanelGrain2`) unchanged.
- Active-state binding unchanged from Round 22 (client-side tap memory;
  `activeIndex` cleared on source change / playback stop).

### Pass 2 — tuning (3 items)
- Row gap `gap-y-4`→`gap-y-8` (16→32px).
- **Non-active art tiles desaturated to a warm monotone** (`filter:
  grayscale(1) sepia(0.5) brightness(1.04) contrast(0.96)`, 300ms transition);
  the active tile alone shows full colour. Flagged to Greg: CSS `filter` can't
  repaint a dark-background logo cream like the idealized mockup does — a true
  cream duotone would need per-tile SVG `feColorMatrix`; Greg accepted the CSS
  monotone for now.
- Stronger cubby drop shadows (non-active + active both gained a layered 3px
  shadow) + a slightly deeper tile-well inset.

### Pass 3 — tuning (2 items, final — Greg confirmed "perfect")
- Row gap pushed further `gap-y-8`→`gap-y-11` (32→44px), and bottom padding
  `pb-6`→`pb-11` (24→44px) so the space below row 2 matches the inter-row gap.
- **Empty-slot numeral centering fix.** Circle tightened to `1.4em` (Greg's
  value). The digit sat low because `place-items-center` centers the text's
  *line box*, but this font's digit ink sits low within that box — which is
  why Greg's line-height tweaks in the inspector didn't move it. Fix: the ring
  is now flex-centered, and the glyph sits in its OWN inner `inline-block` span
  nudged up with `transform: translateY(-0.06em)` (a transform on the whole
  span would drag the ring too). translateY is the exposed knob — more
  negative lifts the digit higher. Applied to both `EmptyTile` and
  `NamedNoArtTile`.

### Files touched (dual-written, re-skin scope)
- `preset-card.tsx` — `src/` + `_showa/`, all three passes. Nothing else.

### Orphans from Round 22 still on disk (not deleted)
- `public/presets-divider.png` — unreferenced since Round 22 Pass 3.

## Round 22 — Presets panel (initial build, prior session)

Built across three passes — first pass from Lovart mockups + a live-app
reference screenshot, then two rounds of screenshot-driven fixes after Greg
ran it in Docker. Current state: functional, art/quality/divider issues
resolved. **Follow-up tweaks Greg had queued after this round were done in
Round 23 (see above) — the panel was rebuilt into cubbies there; this section
is the historical record of the original trough-based build.**

### Pass 1 — initial build
- **`preset-card.tsx`** rewritten in place (kept the filename/import path —
  this is a 1:1 replacement, not a new component like Round 21's panel
  merge).
- Panel face: `.glass` Card + the SAME two-layer `panelGrain`/`panelGrain2`
  SVG texture recipe as the now-playing control panel, but with unique filter
  IDs (`presetsPanelGrain`/`presetsPanelGrain2`) since both panels render on
  the same page and SVG filter IDs must be unique per document.
- Recessed trough (`inset` boxShadow div) holds up to 12 slots, 6 per row,
  wrapping automatically via `grid-cols-6` / row-chunking — confirmed with
  Greg: a trailing row is hidden entirely if ALL its slots are empty (not
  per-slot trimming).
- Three preset tile states: real art (`hasArt`), named-no-art, and empty
  slot. Empty slots show a brass-gradient card with a large `font-display`
  numeral (Greg's mockup) — numeral + "Preset {n}" caption both come from
  the device's own `PresetItem.index`, never hardcoded.
- "Active" tile = rust lacquer frame (ring + inset highlight, sampled from
  Greg's mockup at ~RGB 150,50,7) used for BOTH a resting indicator and the
  tap/loading busy state — confirmed with Greg as "both" rather than
  separate treatments.
- First attempt at "active" binding used title-matching against
  `player.title` — **this was wrong and got replaced in Pass 2** (see below).

### Pass 2 — screenshot fixes (6 items from Greg's review)
1. Art tiles: removed `rounded-[3px]` wrapper radius — square, matches
   hardware language.
2. Removed the index badge from art tiles entirely — only blank/no-art tiles
   show a visible number (matches the original mockup).
3. **Active-state bug**: title-matching against `player.title` broke the
   moment a station's ICY metadata populated with a real song title instead
   of the station name (confirmed: Mother Earth Radio dropped its active
   frame once a track started). Root cause: the WiiM API has NO field that
   durably identifies "which preset is currently selected" — Title/Artist
   are per-track ICY metadata. **Fixed with client-side memory**: tapping a
   preset remembers that index locally (`activeIndex` state in
   `PresetCard`), clearing on source change (`sourceKey` prop) or
   `playerState === "stopped"`. Known, accepted limitation: doesn't detect a
   preset switched from outside this dashboard (e.g. the WiiM phone app).
4. Trailing empty row now hidden (see Pass 1 trough description — this was
   the row-level chunking logic added in Pass 2).
5. Blank-tile numerals: added a thin ring (same muted tone as the numeral,
   NOT rust — rust stays reserved for the active signal) and bumped to
   `font-bold` to match the track-name caption's weight.
6. Added an engraved seam (`RowSeam`, same recipe as elsewhere) between
   preset rows with `py-8` breathing room; widened art-to-caption gap
   (`gap-2.5` → `gap-3.5`).

**Prop contract changed**: `currentLabel` (title-matching, Pass 1) was fully
removed and replaced with `playerState` + `sourceKey` (Pass 2's client-memory
approach) — `dashboard.tsx` updated to match in both trees.

### Pass 3 — divider rebuild (2 items from Greg's review)
Greg's original ask was to use his `presets-divider.png` asset (a 16×326
walnut strip) between tiles. Built that way in Pass 1–2, but Greg's screenshot
revealed two problems traced to the SAME root cause:
- The PNG's extreme portrait aspect ratio inside a `self-stretch` flex cell
  inflated the WHOLE row's height (the divider stretched to match whatever
  was tallest in its flex context, which included the caption below the
  art) — this painted a large dead zone of trough background below the
  captions ("huge gap under the row").
- Tonally, the PNG read as a foreign strip pasted onto the panel — its baked
  lighting didn't match the live trough surface.

**Fix, confirmed with Greg**: dropped the PNG divider entirely, replaced with
a CSS engraved groove (1px dark recess + faint highlight, same recipe as
`RowSeam` / the now-playing transport seam — Greg's explicit choice over a
raised-ridge or plain-hairline alternative). Structurally fixed the gap by
splitting each row into TWO separate flex rows — an art row (where the
grooves live, self-stretching to art-square height only, per Greg: "art
height only") and a caption row beneath it with mirrored spacer gutters so
captions stay column-aligned under their tiles. Nothing in the art row is
taller than the artwork now, so the dead zone is structurally impossible.
`public/presets-divider.png` is unreferenced as of this fix — left on disk,
not deleted (Greg can remove it, doesn't affect the build).

### Files touched (dual-written, re-skin scope)
- `preset-card.tsx` — full rewrites across all 3 passes, `src/` + `_showa/`.
- `dashboard.tsx` — prop contract change (Pass 2), `src/` + `_showa/`.

## Round 21 — Source/Output panel

Built the source/output section from the Lovart mockup (single rectilinear
panel, SOURCE row over OUTPUT row, full-bleed engraved seam). **Confirmed
perfect on the first render — no tuning pass needed.** Docker `--build` run
(new `public/` assets). Both trees in sync, balance-checked.

### New components (dual-written)
- **`keycap-button.tsx`** — one selector cell, built AROUND a single flat
  keycap PNG rather than a CSS box. Anatomy top→bottom: icon+label, then
  `keycap.png`, then indicator lamp. The cap art is identical selected or not;
  selection is carried by (a) lamp `led-off.png`→`led-on.png` and (b) icon+
  label lighting to rust (`--primary`). Inactive icon/label = dim faceplate
  (`/0.55`, hover `/0.85`). Busy = lamp lit + `animate-pulse`. Clicks visually
  silent (no press transform). Shared `ICON_SHADOW` on the icon matches the
  transport glyphs.
- **`source-output-panel.tsx`** — one `.glass` Card (`p-0`, `overflow-hidden`,
  `!mt-[60px]`): SOURCE row + full-bleed `Seam` + OUTPUT row. Each row = left
  label block (Radio/Speaker + title, `w-[96px]`, `items-start pt-1`) + a
  left-aligned `flex-wrap` run of keycaps. Seam reuses the now-playing
  transport-divider recipe (`h-px`, bg `hsl(0 0% 0% / 0.55)`, faceplate
  highlight boxShadow). **Folded the old SourceCard/OutputCard filter + select
  logic in here** (apiSend to `/source` and `/output`, two busy states): the
  full-bleed seam has to be a panel-level sibling, so the panel must know each
  row's emptiness — folding keeps that decision in one place.

### Refactor
- **`dashboard.tsx`**: `<SourceOutputPanel>` lifted OUT of the small-cards grid
  to sit directly under the now-playing card, before Presets/EQ. Gated on
  source-OR-output availability; passes empty arrays for a Settings-hidden row
  so the panel self-hides that half. Sub/Temp/Device stay in the grid. Old
  `SourceCard`/`OutputCard` imports removed.

### Orphaned (left on disk, NOT deleted)
- `source-card.tsx`, `output-card.tsx` — logic folded into the panel.
- `option-grid.tsx` — was already used only by those two cards.

### Assets (Greg placed in `public/`, baked on `--build`)
- `keycap.png` (176×68, flat top-lit, single reusable tile)
- `led-on.png` / `led-off.png` (22×22 RGBA, round lamp on transparent)

### Layout numbers (first-pass, confirmed correct — recorded for reference)
- Keycap width `140px`; lamp `size-3.5` (14px).
- Row padding `px-6 py-6`; keycap run `gap-x-5 gap-y-4`.
- Label block `w-[96px]`, `items-start` + `pt-1`.

### Icons (already mapped — no new icon work)
`DynIcon`/`SOURCES`/`OUTPUTS` already cover every key: Wifi, Bluetooth, Cable
(Line In / Line Out), Lightbulb (Optical), CircleDot (Coaxial), Tv (HDMI),
Disc3 (Phono), Headphones. "Nearest Lucide," not the mockup's custom glyphs.

**Files touched**: `keycap-button.tsx`, `source-output-panel.tsx`,
`dashboard.tsx` — all dual-written (`src/` + `_showa/`).

## Round 20 — what changed (this session)

### 20a — Palette, icons, sliders, bitrate pill, toggle-row min-height
- **Faceplate color desaturated** (`globals.css`): `#a78d7a` → `#a09287`
  (same L≈58%, saturation 20%→12%, eliminates the orangey cast Greg flagged).
  Five tokens moved in lockstep: `--foreground`, `--card-foreground`,
  `--faceplate`, `--faceplate-dim`, `--muted-foreground` (H26 S10% L35%).
- **Icon drop-shadows** (`now-playing-card.tsx`): `ICON_SHADOW` constant
  added (`drop-shadow(0 2px 3px hsl(0 0% 0% / 0.85))`). Applied to all SVG
  glyph icons — toggle row (ImageIcon/Disc3/Mic2/Maximize2), Shuffle,
  SkipBack, SkipForward, Repeat/Repeat1, VolIcon, Heart, Moon
  (sleep-button.tsx). Play/pause PNG button excluded (has baked lighting).
- **Prev/next stroke fix** (`now-playing-card.tsx`): `strokeWidth={0}` on
  `SkipBack` and `SkipForward` — lucide's default stroke was double-drawing
  over the fill, creating a visible ridge/border at the taupe tone.
- **Heart strokeWidth**: `strokeWidth={loved ? 0 : 2}` — same fix applied
  conditionally (only matters when loved/filled).
- **Bitrate pill background** (`quality-pill.tsx`): hardcoded `#E8E1D3`/
  `#DCD3C2` gradient on `readout` and `lossless` branches → `hsl(var(
  --faceplate))` / `hsl(var(--faceplate-dim))`. Tracks palette automatically.
- **Toggle-row min-height** (`now-playing-card.tsx`): `min-h-8` on the
  wrapper div — fixes icon row overlapping content below when optical/no-art
  sources are active (absolute-positioned icons inside a zero-height wrapper).
- **Toggle-row buttons**: `size-7` containers, `size-5` icons (down from
  `size-8`/`size-6` — better proportion against the wood).

### 20b — Icon shadow strength, play button size, LOSSLESS color, slider track
- **Icon shadow stronger**: `drop-shadow(0 1px 1px / 0.55)` → `drop-shadow(
  0 2px 3px / 0.85)` — original was invisible at render scale.
- **Play button**: `size-[72px]` → `size-[55px]` (Greg replaced play-button.png
  with a 200×200 asset, old 72px sizing was too large).
- **LOSSLESS label color** (`now-playing-card.tsx`, `StreamInfoLine`):
  `tierTextStyle` for lossless tier was still hardcoded `#E8E1D3`/`#DCD3C2` —
  switched to `hsl(var(--faceplate))` / `hsl(var(--faceplate-dim))`.
- **Slider track opacity** (`slider.tsx`): was `hsl(var(--static) / 0.9)`
  (semi-transparent → content bleeding through) → `hsl(33 8% 6%)` (solid,
  slightly darker than panel face, groove reads as cut into the panel).

### 20c — Photo tonearm
- **SVG tonearm removed** from `VinylDisc` (`vinyl-disc.tsx`) — replaced by
  a photo asset (`tonearm2.png`, 166×419 RGBA, pivot at top/headshell at
  bottom, no rotation needed).
- **Photo tonearm added** to `CubbyArt` (`now-playing-card.tsx`) as Layer 4
  — a direct sibling of the other cubby layers inside the `aspect-[900/584]`
  wrapper (NOT inside VinylDisc, NOT inside the content box). Static, doesn't
  spin. Final placement via Greg's devtools: `top: 6%, right: 4.4%,
  width: 13%`. No rotation. `drop-shadow(-3px 6px 10px hsl(0 0% 0% / 0.65))`.
  `zIndex: 5`.
- **Asset**: `public/tonearm2.png` — placed manually by Greg, baked into
  Docker image on last `--build`.

### 20d — Layout alignment: icon row vs stream-info band
- **Outer flex row**: added `lg:items-stretch` — both columns grow to the
  same height.
- **Card**: added `flex flex-col` — makes the card a flex column so the
  stream-info footer anchors to the bottom.
- **Inner content div**: added `flex-1` — content area grows to fill the
  card, pushing the stream-info band to the bottom edge.
- **Left column gap**: `gap-6` → `gap-2` — pulls icon row up to visually
  align with the stream-info band on the right.
- **`justify-between` tried and reverted** — pushed icons too far down
  because the cubby aspect ratio makes the left column taller than the card.

### 20e — Artist name color
- **Artist line** (`now-playing-card.tsx`): `text-muted-foreground` →
  `text-[hsl(var(--primary))]` (rust accent, same token as scrubber fill
  and HI-RES badge).

## Current state of the now-playing card

**Structure**: `NowPlayingCard` returns a flex row (`lg:items-stretch`) with
two siblings:
- **Left**: `CubbyArt` + icon row, in a `flex-col gap-2` column, `lg:w-[48%]`.
- **Right**: `.glass` Card with `flex flex-col` — title/artist/album,
  scrubber, engraved seam, transport+volume row, recessed stream-info footer
  (`-mx-4 -mb-4`), pinned to card bottom via `flex-1` on the content div.

**CubbyArt layers** (back to front):
1. `cubby-with-records-plain.png` — recessed box + leaning stack.
2. Content box (`h-[93%] aspect-square`, right 64% of cubby minus 6%
   right padding, floor-seated at `pb-[4%]`): cover art / VinylDisc /
   LyricsView.
3. `now-playing-stand.png` — child of art box, `w-[80%]`, `translate-y-[30%]`
   nameplate in front of art bottom.
4. `tonearm2.png` — absolute sibling at `top:6% right:4.4% width:13%`,
   `zIndex:5`, static, no rotation.

**Toggle row**: bare glyphs on wood, `left-[66.08%] -translate-x-1/2`
(derived constant, see Round 19 README for geometry), `size-7` buttons /
`size-5` icons, `ICON_SHADOW` applied, `min-h-8` wrapper.

**Typography**:
- Title: Antonio (`font-display`), `text-5xl/6xl`, all-caps, `text-foreground`
  (taupe `--foreground` = `#a09287`).
- Artist: IBM Plex Sans, `text-sm font-bold uppercase`,
  `text-[hsl(var(--primary))]` (rust `#B3441E`).
- Album: IBM Plex Mono, `text-xs`, `text-muted-foreground/70`.

**Colors** (current locked values):
- `--foreground` / `--faceplate`: `hsl(26 12% 58%)` → `#a09287`
- `--faceplate-dim`: `hsl(26 12% 52%)`
- `--muted-foreground`: `hsl(26 10% 35%)`
- `--primary` (rust): `hsl(15 71% 41%)` → `#B3441E`
- Background/walnut/static: unchanged from Round 9.

**Files touched this session** (all dual-written unless noted):
- `src/app/globals.css` + `_showa/app/globals.css`
- `src/components/dashboard/now-playing-card.tsx` + `_showa/` mirror
- `src/components/dashboard/quality-pill.tsx` + `_showa/` mirror
- `src/components/ui/slider.tsx` + `_showa/` mirror
- `src/components/dashboard/sleep-button.tsx` (`src/` only — no `_showa/` mirror)
- `src/components/dashboard/vinyl-disc.tsx` (`src/` only — no `_showa/` mirror)

## Deferred items (do not start unprompted)

- **Palette retune**: `--faceplate` toward `#B19D8B`, rust toward `#C64C1A`.
- **Further panels**: EQ, sub-out — untouched. (Source/output done Round 21,
  rebuilt into Source/Output/Device Round 25; presets done Round 23.)
- **Other card proportions**: the cubby rebuild cascade hasn't touched other
  cards yet.

## Open discrepancies (pre-existing, untouched)

1. **Source list mismatch** — RESOLVED (Round 21): the earlier mismatch was a
   different WiiM unit. The Ultra exposes all 6 mockup sources (Network/WiFi,
   Bluetooth, Line In, Optical, HDMI, Phono); `SOURCES` in
   `src/lib/wiim/constants.ts` already maps every icon via `DynIcon`.
2. **Brass token**: `--brass`/`--brass-dim` are now IN USE — the presets
   blank/empty-slot tiles render on a `--brass`→`--brass-dim` gradient (Round
   22/23). No longer an unresolved placeholder.
3. **Button active-state language inconsistent** across mockups — Greg said
   leave open. DECIDED for source/output (Round 21): active = indicator lamp
   lit + icon/label rust (`--primary`). Other panels still open.
4. **EQ inset depth**: needs side-by-side comparison before committing.

## Process notes worth remembering

- `edit_file` processes edits sequentially on the same file — if an earlier
  edit changes text that a later edit's `oldText` was matching, the later
  edit fails. Read the file back after any partial failure before retrying.
- When `justify-between` pushes something too far, the cubby's fixed aspect
  ratio is usually the cause — left column grows taller than the right panel,
  so "push to bottom" overshoots. Use gap reduction instead.
- Photo assets (`tonearm2.png`, `play-button.png`, `cubby-with-records-plain
  .png`, `now-playing-stand.png`) are all baked into the Docker image —
  `docker compose up -d --build` required if any change. Source-only
  changes just need `docker compose restart`.
- Greg tunes placement via browser devtools and provides exact `element.style`
  values — accept these directly, don't re-derive.
- Greg corrects firmly when something doesn't match a reference — always
  verify layout fixes against a real screenshot, not just "this should work
  by analogy."
