# Parametric EQ — Stereo / L-R channel-mode support (implementation spec)

**Status:** discovery essentially complete; ready to implement A+D immediately.
Filter-type enum CONFIRMED (§1). One probe still outstanding before the WRITE
path (B): the L/R single-channel write shape (§7.2). Mode-switch command (C)
also unverified (§7.3) and deferred.

**Why:** the app hardcodes `channelMode: "Stereo"` on every parametric read and
write. When the device is in **L/R** mode (set from the WiiM phone app, which
takes precedence), reads come back with the bands under `EQBandL`/`EQBandR`
instead of the flat `EQBand` our code parses — so every band falls through to
defaults and presets appear empty. Confirmed live via debug logging.

---

## 1. Ground truth from the device (verified via debug logs)

Parametric read = `EQGetLV2SourceBandEx:{source_name, pluginURI:EqNp}`.

**Stereo mode** returns a flat array:
```
{ status, EQLevel, source_name, EQStat, Name, pluginURI, channelMode:"Stereo",
  EQBand: [ {index, param_name, value}, ... ] }
```

**L/R mode** returns two per-channel arrays, NO flat `EQBand`:
```
{ ..., channelMode:"L/R", EQBandL:[...], EQBandR:[...] }
```

**Band count is 12, not 10.** Both modes expose bands **a–l** (a,b,c,d,e,f,g,
h,i,j,k,l) × 4 fields (`_mode`,`_freq`,`_q`,`_gain`) = 48 entries. The phone app
only *displays* 10 (a–j); k and l exist in firmware and must be preserved on
write even if we only show 10. Param naming is identical in both modes — only
the container key differs (`EQBand` vs `EQBandL`/`EQBandR`).

**L and R hold independent values** — confirmed `leftEqualsRight:false` for a
real preset. This is genuine dual-channel, not a linked pair.

**Filter types** — CONFIRMED against both the phone-app UI and raw device
values (band 5=LP→`e_mode=3`, band 6=HP→`f_mode=5`, band 7=OFF→-1,
band 8=HS→2):

| Type | Label | mode value |
|------|-------|-----------|
| Off        | OFF | -1 |
| Low Shelf  | LS  | 0  |
| Peak       | PK  | 1  |
| High Shelf | HS  | 2  |
| Low Pass   | LP  | 3  |
| High Pass  | HP  | 5  |

`4` is unused/reserved (firmware skips it). Six types total. **LP and HP use
freq + Q only — gain is N/A** (the app greys out the gain field for both). The
UI should disable/hide the gain control when a band's type is LP or HP.

**No channel-mode-set command exists** in the current `EqCmd` table. Switching
Stereo↔L/R most likely goes through `setSourceBand` with a `channelMode` field
(unverified) — or an undiscovered command. See §7.

---

## 2. Scope decision (confirm before building)

Three coupled pieces, in rough order of necessity:

- **(A) Read/display correctly in whatever mode the device is in** — REQUIRED.
  Without this, L/R presets are broken. Low risk, no new UI beyond a channel
  toggle to *view* L vs R.
- **(B) Write/edit per channel in L/R mode** — the natural completion of (A).
  Needs the L/R write shape confirmed (§7).
- **(C) PEQ Mode switch (Stereo↔L/R) from our UI** — largest surface area;
  needs the mode-set command confirmed (§7). Can be deferred (leave mode
  switching to the phone app) without blocking A/B.
- **(D) Add LP/HP filter types** — independent, small, needs the two mode
  numbers (§7). Can ship with A/B.

**Recommended first milestone:** A + B + D (read, edit per channel, full type
list), **defer C** (mode switch) to a later round. Rationale: A/B/D make L/R
fully usable for the common case (device already in the mode you want, set once
from the phone app); C adds a whole state-machine + command we haven't verified.

---

## 3. Data model changes (`src/lib/wiim/types.ts`)

Current:
```ts
export interface ParametricBand {
  letter: string; mode: number; frequency: number; q: number; gain: number;
}
```

Two viable shapes:

**Option 1 — per-channel band arrays (recommended).** Keep `ParametricBand` as
the single-channel band shape. Change the *container* to hold channels:
```ts
export type PeqChannelMode = "stereo" | "lr";
export type PeqChannel = "stereo" | "left" | "right";

export interface EqParametricState {
  name: string;
  channelMode: PeqChannelMode;
  // stereo: only `stereo` populated. lr: `left` + `right` populated.
  bands: Partial<Record<PeqChannel, ParametricBand[]>>;
}
```
`EqSourceState.parametric` becomes `EqParametricState` (was
`{name, channelMode, bands}`).

**Option 2 — flat with channel tag on each band.** More churn in the UI; not
recommended.

Keep bands a–l internally (12) even if UI shows 10 — so k/l round-trip
untouched. Add to `eq-constants.ts`:
```ts
export const PEQ_LETTERS_ALL = ["a".."l"];      // 12, for parse/serialize
export const PEQ_LETTERS_VISIBLE = ["a".."j"];  // 10, for the UI
```
(Confirm whether to show 10 or 12 — see §6.)

---

## 4. Parse layer (`src/lib/wiim/eq.ts`)

`RawEq` needs the per-channel keys:
```ts
interface RawEq {
  ...
  channelMode?: string;                                  // "Stereo" | "L/R"
  EQBand?:  { param_name?: string; value?: number }[];   // stereo
  EQBandL?: { param_name?: string; value?: number }[];   // lr
  EQBandR?: { param_name?: string; value?: number }[];   // lr
}
```

`bandMap` currently only reads `raw.EQBand`. Generalize it to take an explicit
array:
```ts
function bandMapFrom(arr): Map<string, number> { ... same body over `arr` ... }
```

`parseParametric` branches on `channelMode`:
```ts
function parseParametric(raw): EqParametricState {
  const mode = raw.channelMode === "L/R" ? "lr" : "stereo";
  const toBands = (arr) => {
    const m = bandMapFrom(arr ?? []);
    return PEQ_LETTERS_ALL.map((l) => ({
      letter: l,
      mode: Math.round(m.get(`${l}_mode`) ?? 1),
      frequency: m.get(`${l}_freq`) ?? PEQ_DEFAULT_FREQ[l] ?? 1000,
      q: m.get(`${l}_q`) ?? 0.25,
      gain: m.get(`${l}_gain`) ?? 0,
    }));
  };
  if (mode === "lr") {
    return { name: raw.Name ?? "", channelMode: "lr",
             bands: { left: toBands(raw.EQBandL), right: toBands(raw.EQBandR) } };
  }
  return { name: raw.Name ?? "", channelMode: "stereo",
           bands: { stereo: toBands(raw.EQBand) } };
}
```
Note `PEQ_DEFAULT_FREQ` currently only has a–j; extend to k/l (pick sensible
defaults, e.g. k=?, l=? — or omit and let the device value always win, since a
real read always includes them).

Graphic path is unchanged.

---

## 5. Write layer (`src/lib/wiim/eq.ts`) — needs §7 confirmation

`setParametricBand` currently hardcodes `channelMode: "Stereo"` and `EQBand`.
It must target the right channel/container. Proposed signature:
```ts
setParametricBand(ip, source, channel: PeqChannel, letter, params)
```
- `channel === "stereo"` → `channelMode:"Stereo"`, key `EQBand` (as today).
- `channel === "left"`   → `channelMode:"L/R"`, key `EQBandL`.
- `channel === "right"`  → `channelMode:"L/R"`, key `EQBandR`.

**UNVERIFIED:** whether an L/R write must include BOTH `EQBandL` and `EQBandR`
in one payload, or whether a single-channel partial write is accepted. Confirm
via §7 before shipping (B). If both are required, the setter must read-modify-
write the untouched channel, or the caller must pass both.

The API route (`src/app/api/devices/[id]/eq/route.ts`) `setParametric` action
needs a `channel` field added to the zod schema and threaded through.

---

## 6. UI (`src/components/dashboard/eq-card.tsx` — DUAL-WRITE with `_showa/`)

- **Left/Right toggle** (only shown when `channelMode === "lr"`): a two-button
  segmented control (matches phone app's Left/Right pill). Selecting swaps which
  channel's bands the 10 rows render + edit. Local UI state, e.g.
  `const [chan, setChan] = useState<"left"|"right">("left")`.
- Rows read from `parametric.bands[chan]` (lr) or `parametric.bands.stereo`
  (stereo). `PeqRow`'s `set()` passes the active `channel` to the API.
- **Filter type dropdown**: extend `PEQ_MODES` to the six confirmed types:
  `{-1:Off, 0:Low Shelf, 1:Peak, 2:High Shelf, 3:Low Pass, 5:High Pass}`
  (value 4 unused). When a band is LP or HP, disable/hide the gain slider +
  readout (freq + Q only, matching the app).
- **10 vs 12 bands**: recommend showing 10 (a–j) to match the phone app; iterate
  over `PEQ_LETTERS_VISIBLE`. k/l are parsed and written-through but not shown.
- **(Deferred, milestone C)** PEQ Mode dropdown (Stereo/L-R) — needs the mode
  command (§7). When stereo, hide the L/R toggle (as now).

**Dual-write discipline reminder:** every edit to `eq-card.tsx` goes to BOTH
`src/components/dashboard/eq-card.tsx` and `_showa/components/dashboard/
eq-card.tsx`, verified byte-identical (sha256) + bracket-balance checked. The
lib files (`src/lib/wiim/*`) are `src`-ONLY, not mirrored.

---

## 7. Remaining device probes (do BEFORE writing the write path / mode switch)

Small, targeted — each is one action in the phone app + a log read.

1. ~~**LP/HP mode numbers**~~ — RESOLVED. LP=3, HP=5 (value 4 unused).
   Confirmed against phone-app UI + raw values. See §1 table.
2. **L/R write shape** (blocks B) — RUN THIS AS STEP ONE OF MILESTONE B, not
   as a separate pass. It can't be cleanly separated from building the write
   path (it *is* a trial write). Procedure:
   - FIRST record the current L and R values of a **scratch/throwaway** state
     (or note them so they can be restored) — this is the first WRITE we do in
     L/R mode, and a bad payload can scramble a real preset. Do NOT probe
     against a carefully-tuned preset like "9db bass shelf".
   - Send a `setSourceBand` with `channelMode:"L/R"` and only `EQBandL`
     populated (one band changed), then read back and check whether `EQBandR`
     was preserved or wiped/zeroed.
   - **If R preserved** → single-channel writes are safe; `setParametricBand`
     stays simple (one channel per call, key `EQBandL`/`EQBandR`/`EQBand`).
   - **If R wiped** → the setter must read-modify-write: fetch current state,
     merge the one changed band into the correct channel, send BOTH
     `EQBandL`+`EQBandR` in one payload. (More work; the parse layer from §4
     gives you the current values to merge against.)
   A temporary debug log echoing the post-write read is the cleanest way to
   observe the result (mirror the `[eq-debug]` pattern that was in `eqCall`;
   remove before close).
3. **Mode-switch command** (blocks C only): observe what the phone app sends, or
   trial `setSourceBand` with `channelMode:"L/R"` + empty bands and see if the
   device flips mode. If no such command works, C may not be feasible via the
   documented surface.

---

## 8. Debug logging status

The discovery-session `[eq-debug]` logging (added to `eqCall` in
`src/lib/wiim/eq.ts` while probing) has ALREADY been removed — `eq.ts` is
back to its pre-session state, verified clean. Any NEW temporary logging the
4.6 session adds (e.g. for the §7.2 write probe) must likewise be stripped
before that session closes, per project convention.

---

## 9. Handoff notes

- Discovery (this doc) is done. Filter-type enum and both mode shapes are
  CONFIRMED against the live device. This is being handed to a fresh session
  (Sonnet 4.6) to implement.
- **Recommended order for the 4.6 session:**
  1. **Milestone A + D first** (read/display correct in either mode, add the
     six-type dropdown with LP/HP + gain-disable). Fully specified here, no
     device probes needed, low risk. This alone fixes the reported bug
     (L/R presets showing defaults).
  2. **Milestone B** (per-channel editing) — begin by running the §7.2 write
     probe as step one (see §7.2 for the exact procedure + safety note), then
     implement the write path according to what it finds.
  3. **Milestone C** (Stereo↔L/R switch) — only if §7.3 confirms a working
     command; otherwise leave mode-switching to the phone app.
- Files touched: `types.ts`, `eq-constants.ts`, `eq.ts`, `eq/route.ts` (all
  `src`-only), and `eq-card.tsx` (DUAL-WRITE with `_showa/`). No new `public/`
  assets.
- **Dual-write discipline** (from project handoff docs): every `eq-card.tsx`
  edit goes to BOTH `src/components/dashboard/` and `_showa/components/
  dashboard/`, verified byte-identical via sha256 + a bracket-balance check,
  after every edit. The `src/lib/wiim/*` files are `src`-ONLY.
- Debug logging convention: any temporary `[eq-debug]` logging added while
  probing must be stripped before the session closes (the read-probe logging
  from the discovery session has already been removed).
