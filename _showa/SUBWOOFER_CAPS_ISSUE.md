# GitHub Issue Draft — `caps.subwoofer` false positive

**Target repo:** `illianoaoi/Wiim-Dashboard`
**Status:** Ready to post. Payload evidence captured this session (see `_showa/diag-102.json`, `_showa/diag-195.json`).

---

## Title

`caps.subwoofer` false-positive: sub-out panel shows on devices without sub-out hardware

## Body

### Summary

`detectCapabilities()` in `lib/wiim/capabilities.ts` classifies a device as subwoofer-capable whenever `getSubLPF` returns JSON containing a `level` or `status` field. Every LinkPlay device I tested answers `getSubLPF` with a populated default payload regardless of whether it has sub-out hardware, so the check is a false positive on non-sub devices and the Sub-Out card renders for them.

### Environment

Two devices on the same LAN:

- WiiM Ultra (has sub-out) -> panel correct
- WiiM Mini-class unit (no sub-out) -> panel shown incorrectly

### Root cause

The two device classes return structurally different `getSubLPF` payloads.

Device **without** sub-out hardware:

```json
{"status":0,"output_mode":1,"cross":80.000000,"phase":0.000000,"level":0.000000,"mix_sub":1,"main_filter":1,"sub_filter":1,"sub_delay":0.000000}
```

Device **with** sub-out hardware:

```json
{"status":0,"delay_main_sub":"1.0","plugged":1,"output_mode":1,"cross":100,"phase":0,"level":0,"mix_sub":1,"main_filter":0,"sub_filter":1,"sub_delay":-23,"linein_delay":0.00}
```

Both carry `status` and `level`, so the current guard cannot tell them apart:

```js
const subwoofer =
  !!subJson &&
  (subJson.level != null || subJson.status != null) &&
  !subText.toLowerCase().includes("unknown command");
```

The sub-less payload is a generic template — every numeric is a formatted float (`N.000000`) and `cross` is the default `80`. The real hardware additionally returns three fields the template lacks: `plugged`, `delay_main_sub`, and `linein_delay`.

### Fix

Key the capability on the presence of `plugged` (which the parser already reads into `SubwooferStatus.connected`). Using field **presence** rather than its `0/1` value means the capability tracks the hardware, not the live physical connection, so a momentarily-unplugged sub does not drop the panel:

```js
const subwoofer =
  !!subJson &&
  subJson.plugged != null &&
  !subText.toLowerCase().includes("unknown command");
```

### Note on caching

Capabilities are cached in the `devices` table and only rewritten by the refresh route / re-add, so existing rows need a manual re-probe after this change to clear a stale `subwoofer: true`.

### Caveat for the maintainer

I have confirmed `plugged` distinguishes the two devices I have on hand (Ultra vs. a Mini-class unit). I have **not** verified it across the full range of sub-capable models. Other models with sub-out (Amp, Amp Pro, Amp Ultra, Pro Plus, etc.) very likely expose the same `plugged` field, but I cannot confirm that firsthand — and it is at least conceivable that some model reports `plugged` only when a sub is physically connected rather than as a persistent hardware marker. Worth a second data point from anyone with other sub-capable hardware before treating this discriminator as universal. This matches how sub-out (`getSubLPF`/`setSubLPF`) is already treated in the README as community-verified rather than officially documented.
